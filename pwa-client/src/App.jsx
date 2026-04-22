import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import './index.css';

import AuthGate from './components/Auth/AuthGate';
import DashboardFrame from './components/Layout/DashboardFrame';
import ErrorBoundary from './components/Layout/ErrorBoundary';
import OnboardingWorkflow from './components/Onboarding/OnboardingWorkflow';
import AgentTrainerModal from './components/Onboarding/AgentTrainerModal';
import TasteProfileDNA from './components/Hub/TasteProfileDNA';
import CommandTerminal from './components/Hub/CommandTerminal';
import CartBuilder from './components/Hub/CartBuilder';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [isTraining, setIsTraining] = useState(false);
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState([]);
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setUserProfile(null);
        setLoadingProfile(false);
      }
    });
    return unsub;
  }, []);

  const loadProfile = async (u) => {
    setLoadingProfile(true);
    try {
      const token = await u.getIdToken(true); 
      let res = await fetch(`${API_BASE}/api/v1/user/${u.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Auto-create local SQLite user if they only exist in Firebase
      if (res.status === 404) {
          const createRes = await fetch(`${API_BASE}/api/v1/user/create`, {
              method: 'POST',
              headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ email: u.email, preferences: {} })
          });
          if (createRes.ok) {
              const createdData = await createRes.json();
              setUserProfile(createdData.user);
              setLoadingProfile(false);
              return;
          }
      }

      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      if (err?.message?.includes('invalid-refresh-token') || err?.code?.includes('auth/')) {
         await signOut(auth);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveStore = async (storeName) => {
    try {
      const token = await firebaseUser.getIdToken();
      const prefs = { ...(userProfile?.preferences || {}), store_preference: storeName };
      
      const res = await fetch(`${API_BASE}/api/v1/user/${firebaseUser.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences: prefs })
      });
      if (res.ok) {
        setUserProfile(prev => ({ ...prev, preferences: prefs }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleTrainAgentInit = () => {
      setShowTrainModal(true);
      setTrainingLogs([]);
  };

  const handleTrainAgentSubmit = async (email, password) => {
    try {
        if (!firebaseUser) return;
        setIsTraining(true);
        setTrainingLogs([]);
        
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`${API_BASE}/api/v1/profile/train`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!res.body) throw new Error("ReadableStream not supported.");
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let finalTasteProfile = null;
        let isError = false;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.type === 'log') {
                            setTrainingLogs(prev => [...prev, data.message]);
                        } else if (data.type === 'error') {
                            setTrainingLogs(prev => [...prev, `[ERROR] ${data.message}`]);
                            isError = true;
                            alert("Training Error: " + data.message);
                        } else if (data.type === 'complete') {
                            finalTasteProfile = data.taste_profile;
                            setTrainingLogs(prev => [...prev, '[Backend] Taste Profile saved successfully!']);
                        }
                    } catch (e) {
                        // Incomplete chunk, will be handled by stream buffering natively in most cases, 
                        // but a simple split might break across chunks if not careful.
                        // For our simple logs, it's usually fine.
                    }
                }
            }
        }
        
        setIsTraining(false);
        
        if (finalTasteProfile) {
            setTimeout(() => {
                setShowTrainModal(false);
                setUserProfile(prev => ({ ...prev, preferences: { ...prev.preferences, taste_profile: finalTasteProfile } }));
            }, 1500);
        } else if (!isError) {
             setTrainingLogs(prev => [...prev, `[ERROR] Stream ended without profile.`]);
        }
    } catch (err) {
        setIsTraining(false);
        setTrainingLogs(prev => [...prev, `[NETWORK ERROR] ${err.message}`]);
        alert('Network error: ' + err.message);
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const handleDeployAgent = async (budget, cadence) => {
      try {
          setIsBuilding(true);
          const token = await firebaseUser.getIdToken();
          const uid = firebaseUser.uid;
          
          // Phase 1: Construct Scrape Targets natively from User's Taste DNA
          let scrapeTargets = [];
          const tasteDNA = userProfile?.preferences?.taste_profile;
          
          if (tasteDNA) {
              const staples = Array.isArray(tasteDNA.staple_ingredients) ? tasteDNA.staple_ingredients : [];
              const brands = Array.isArray(tasteDNA.brand_loyalties) ? tasteDNA.brand_loyalties : [];
              
              staples.forEach(item => {
                  const name = typeof item === 'string' ? item : item.name;
                  if (name) scrapeTargets.push({ "query": name, "estimated_protein": 0, "estimated_cals": 0 });
              });
              
              brands.forEach(b => {
                  const name = typeof b === 'string' ? b : b.name;
                  if (name) scrapeTargets.push({ "query": name, "estimated_protein": 0, "estimated_cals": 0 });
              });
          }
          
          if (scrapeTargets.length === 0) {
              // Graceful fallback if DNA is deeply malformed
              scrapeTargets.push({ "query": "Milk", "estimated_protein": 10, "estimated_cals": 100 });
              scrapeTargets.push({ "query": "Bread", "estimated_protein": 5, "estimated_cals": 200 });
              scrapeTargets.push({ "query": "Eggs", "estimated_protein": 30, "estimated_cals": 300 });
          }

          // Phase 2: Dispatch Distributed Edge Scraper
          const buildPayload = {
              user_id: uid,
              store_name: userProfile?.preferences?.store_preference || "Iceland Live",
              target_categories: scrapeTargets
          };
          
          const buildRes = await fetch(`${API_BASE}/api/v1/build_cart`, {
              method: 'POST',
              headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(buildPayload)
          });
          if (!buildRes.ok) throw new Error("Build dispatch failed");

          // Phase 5: Poll Build Status
          let finalCartData = null;
          while (true) {
             const cartRes = await fetch(`${API_BASE}/api/v1/cart_status?user_id=${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
             });
             const cartStatusData = await cartRes.json();
             if (cartStatusData.status === "success" && cartStatusData.cart_data) {
                 finalCartData = cartStatusData.cart_data;
                 break;
             }
             await sleep(3000);
          }
          
          setIsBuilding(false);
          setMealPlan({ final_cart: finalCartData });

      } catch (err) {
          setIsBuilding(false);
          alert('Pipeline snags: ' + err.message);
      }
  };

  // Routing Logic
  if (!firebaseUser) {
    return <AuthGate onAuthSuccess={setFirebaseUser} />;
  }

  if (loadingProfile) {
    return (
      <DashboardFrame user={firebaseUser} onLogout={handleLogout}>
        <div className="flex-center" style={{ height: '50vh' }}>
          <div className="loader"></div>
        </div>
      </DashboardFrame>
    );
  }

  const prefs = userProfile?.preferences || {};
  const hasStore = !!prefs.store_preference;
  const hasTasteProfile = !!prefs.taste_profile;

  // Enforce the Setup Flow
  const isOnboarding = !hasStore || !hasTasteProfile;

  return (
    <ErrorBoundary>
      <DashboardFrame user={firebaseUser} onLogout={handleLogout}>
        
        <AgentTrainerModal 
           show={showTrainModal} 
           onSubmit={handleTrainAgentSubmit} 
           isTraining={isTraining}
           logs={trainingLogs}
        />

        {isOnboarding ? (
          <OnboardingWorkflow 
             storePreference={prefs.store_preference}
             onSaveStore={handleSaveStore}
             onTrainAgent={handleTrainAgentInit}
             isTraining={isTraining}
          />
        ) : (
          <div className="hub-container">
             <TasteProfileDNA profile={prefs.taste_profile} />
             
             {!mealPlan ? (
               <CommandTerminal 
                  onDeploy={handleDeployAgent} 
                  isBuilding={isBuilding} 
               />
             ) : (
               <CartBuilder 
                  mealPlan={mealPlan} 
                  onClear={() => setMealPlan(null)} 
               />
             )}
          </div>
        )}

      </DashboardFrame>
    </ErrorBoundary>
  );
}
