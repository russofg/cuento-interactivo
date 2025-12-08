import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppStep, GameState, StorySegment, THEMES } from './types';
import { startNewStory, continueStory } from './services/geminiService';

// --- ICONS ---
const IconHeart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
);
const IconFeather = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
);
const IconFlame = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.115.38-2.169 1-3.044.863 1.303 1.5 2.544 1.5 3.544Z"/></svg>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.AGE_GATE);
  const [gameState, setGameState] = useState<GameState>({
    history: [],
    currentSegment: null,
    isLoading: false,
    error: null,
    theme: THEMES[0],
    playerName: '',
    gender: 'Mujer',
    orientation: 'Hombres'
  });

  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic to prevent text from being hidden behind footer
  useEffect(() => {
    if (endRef.current) {
      setTimeout(() => {
        // block: 'end' aligns the bottom of the spacer to the bottom of the viewport.
        // Since the spacer is very tall (45vh), this pushes the actual content 
        // significantly up, clearing the fixed footer comfortably.
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    }
  }, [gameState.currentSegment, gameState.history, gameState.isLoading]);

  const handleAgeVerify = () => {
    setStep(AppStep.SETUP);
    window.scrollTo(0,0);
  };

  const handleStartGame = async () => {
    if (!gameState.playerName.trim()) return;

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const segment = await startNewStory(
        gameState.playerName,
        gameState.gender,
        gameState.orientation,
        gameState.theme
      );
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        currentSegment: segment,
        history: [{ role: 'model', text: segment.content }]
      }));
      setStep(AppStep.PLAYING);
      window.scrollTo(0,0);
    } catch (err: any) {
      setGameState(prev => ({ ...prev, isLoading: false, error: "Error al iniciar la fantasía. Inténtalo de nuevo." }));
    }
  };

  const handleChoice = async (choiceText: string) => {
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const currentHistory = [...gameState.history];
    const newHistoryEntry = { role: 'user', text: choiceText }; 
    const historyForApi = [...currentHistory, { role: 'user', text: `Acción: ${choiceText}` }];

    const playerProfile = {
      name: gameState.playerName,
      gender: gameState.gender,
      orientation: gameState.orientation
    };

    try {
      const segment = await continueStory(historyForApi, choiceText, playerProfile);
      
      setGameState(prev => {
        const updatedHistory = [...currentHistory, newHistoryEntry, { role: 'model', text: segment.content }];
        return {
          ...prev,
          isLoading: false,
          currentSegment: segment,
          history: updatedHistory
        };
      });

      if (segment.isEnding) {
        setStep(AppStep.GAME_OVER);
      }
    } catch (err: any) {
      console.error(err);
      setGameState(prev => ({ ...prev, isLoading: false, error: "Conexión interrumpida o contenido bloqueado." }));
    }
  };

  const resetGame = () => {
    setStep(AppStep.SETUP);
    setGameState({
      history: [],
      currentSegment: null,
      isLoading: false,
      error: null,
      theme: THEMES[0],
      playerName: '',
      gender: 'Mujer',
      orientation: 'Hombres'
    });
    window.scrollTo(0,0);
  };

  // --- SUB-COMPONENTS ---

  const renderSelectionCard = (label: string, value: string, current: string, onClick: (val: string) => void) => (
    <motion.button
      whileHover={{ 
        scale: 1.02,
        y: -2
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(value)}
      className={`relative w-full py-4 sm:py-5 rounded-lg border transition-all duration-300 flex items-center justify-center group overflow-hidden touch-manipulation min-h-[56px] sm:min-h-[60px] ${
        current === value 
          ? 'bg-red-950/30 border-red-600/60 text-red-200 shadow-[0_0_20px_rgba(220,38,38,0.2)]' 
          : 'bg-zinc-900/50 border-zinc-700/50 text-gray-400 hover:border-red-800/40 hover:text-gray-300 hover:bg-zinc-800/40'
      }`}
    >
      {/* Subtle background gradient when selected */}
      {current === value && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-red-900/10 via-red-800/5 to-transparent"
        />
      )}
      
      {/* Text */}
      <span className={`relative font-ui text-sm sm:text-base tracking-[0.15em] uppercase z-10 transition-all duration-300 ${
        current === value ? 'font-semibold' : 'font-normal'
      }`}>
          {label}
        </span>
        
      {/* Active Indicator - clean dot */}
        {current === value && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-2 w-1.5 h-1.5 bg-red-500 rounded-full"
        />
      )}
    </motion.button>
  );

  // --- ANIMATION VARIANTS ---
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  // --- VIEWS ---

  if (step === AppStep.AGE_GATE) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="age-gate"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black"
        >
        {/* Atmospheric Background */}
          <motion.div
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 0.2 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542259681-d7031c5521eb?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center"
          ></motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
          
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="relative z-10 max-w-lg w-full text-center p-5 sm:p-6 md:p-10 border border-red-900/10 rounded-2xl backdrop-blur-sm"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 sm:mb-8 md:mb-10 flex justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border border-red-900/50 rounded-full flex items-center justify-center pulse-glow bg-black/50"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="text-xl sm:text-2xl md:text-3xl text-red-600 font-display"
                >
                  18+
                </motion.span>
              </motion.div>
            </motion.div>
            
            <motion.h1
              variants={itemVariants}
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 font-display font-bold tracking-tighter drop-shadow-2xl text-shadow-red leading-tight px-2"
            >
              Fantasías <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-red-700 italic font-serif block sm:block md:inline mt-1 sm:mt-0"
              >
                Infinitas
              </motion.span>
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-gray-400 mb-8 sm:mb-10 md:mb-12 text-sm sm:text-base md:text-xl font-serif leading-relaxed px-2 sm:px-3 md:px-4 opacity-80"
            >
              Una inmersión narrativa donde el deseo guía el camino. <br className="hidden sm:block"/> Contenido explícito.
            </motion.p>
            
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            onClick={handleAgeVerify}
              className="group relative px-8 sm:px-10 md:px-14 py-3.5 sm:py-4 md:py-5 bg-transparent overflow-hidden rounded-sm w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 blur-md"
              ></motion.div>
              <motion.div
                whileHover={{ borderColor: "rgba(239, 68, 68, 0.6)" }}
                className="absolute inset-0 border border-red-800/40 transition-colors duration-500"
              ></motion.div>
              <span className="relative text-red-100 font-display tracking-[0.2em] sm:tracking-[0.3em] font-bold flex items-center gap-2 sm:gap-3 justify-center text-xs sm:text-sm md:text-base">
                ENTRAR <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <IconFlame />
                </motion.span>
            </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (step === AppStep.SETUP) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#0a0a0a] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden"
        >
          {/* Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-red-600/30 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0
                }}
                animate={{
                  y: [null, Math.random() * window.innerHeight],
                  opacity: [0, 0.5, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>

          {/* Animated Gradient Orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-800/15 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-16 relative z-10"
          >
            
            {/* Left Column: Atmospheric Side Panel (Top on Mobile) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-4 flex flex-col justify-center border-b border-red-900/30 pb-8 sm:pb-10 pl-0 text-center lg:text-left lg:border-b-0 lg:border-l-2 lg:border-red-900/30 lg:pl-8 xl:pl-12 relative lg:order-last"
            >
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:block absolute -left-[3px] top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-red-600 to-transparent blur-[3px]"
              />
              
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-display mb-4 sm:mb-6 md:mb-8 leading-tight px-2 sm:px-0"
              >
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Diseña
                </motion.span>
                <br/>
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative inline-block"
                >
                  <span className="text-red-600 italic font-serif relative z-10">Tu Deseo</span>
                  <motion.span
                    className="absolute inset-0 bg-red-600/20 blur-xl"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.span>
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-gray-400 font-serif text-lg sm:text-xl md:text-2xl leading-relaxed px-2 sm:px-0 italic"
              >
                    "La anticipación es la forma más pura de placer. Cuéntame quién eres y déjame prepararte..."
              </motion.p>
              
              <motion.div
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="mt-8 sm:mt-10 md:mt-14 opacity-40 text-red-500 flex justify-center lg:justify-start"
              >
                    <IconFeather />
              </motion.div>
            </motion.div>

            {/* Right Column: Interactive Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8 space-y-8 sm:space-y-10 md:space-y-12"
            >
                
                {/* Name Input */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="space-y-4 sm:space-y-5 group"
                >
                    <motion.label
                      animate={{
                        color: gameState.playerName ? "#dc2626" : "#7f1d1d"
                      }}
                      className="text-xs sm:text-sm font-ui uppercase tracking-[0.3em] text-red-900/70 group-focus-within:text-red-600 transition-colors font-bold"
                    >
                      Nombre del Protagonista
                    </motion.label>
                    <motion.div
                      className="relative"
                      whileFocus={{ scale: 1.01 }}
                    >
                      <motion.input
                        type="text" 
                        value={gameState.playerName}
                        onChange={(e) => setGameState({...gameState, playerName: e.target.value})}
                        className="w-full bg-transparent border-b-2 border-zinc-800/50 py-3 sm:py-4 md:py-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-serif focus:border-red-600 focus:outline-none placeholder-zinc-700/50 transition-all focus:pl-3 sm:focus:pl-4 min-h-[56px] relative z-10"
                        placeholder="Escribe aquí..."
                    />
                      <motion.div
                        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: gameState.playerName ? "100%" : "0%"
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                      />
                    </motion.div>
                </motion.div>

                {/* Identity & Orientation Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12"
                >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="space-y-4 sm:space-y-5"
                    >
                        <motion.label
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-xs sm:text-sm font-ui uppercase tracking-[0.3em] text-zinc-500 font-bold"
                        >
                          Identidad
                        </motion.label>
                        {/* Mobile: Grid cols 3 for horizontal buttons */}
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4">
                             {['Mujer', 'Hombre', 'No Binario'].map((g, idx) => (
                                <motion.div
                                  key={g}
                                  initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                  transition={{ 
                                    delay: 0.8 + idx * 0.15,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15
                                  }}
                                  whileHover={{ scale: 1.05, z: 10 }}
                                >
                                  {renderSelectionCard(g, g, gameState.gender, (v) => setGameState({...gameState, gender: v}))}
                                </motion.div>
                             ))}
                        </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="space-y-4 sm:space-y-5"
                    >
                        <motion.label
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                          className="text-xs sm:text-sm font-ui uppercase tracking-[0.3em] text-zinc-500 font-bold"
                        >
                          Interés
                        </motion.label>
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4">
                            {['Hombres', 'Mujeres', 'Todo'].map((o, idx) => (
                                <motion.div
                                  key={o}
                                  initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                  transition={{ 
                                    delay: 0.9 + idx * 0.15,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15
                                  }}
                                  whileHover={{ scale: 1.05, z: 10 }}
                                >
                                  {renderSelectionCard(o, o, gameState.orientation, (v) => setGameState({...gameState, orientation: v}))}
                                </motion.div>
                             ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Theme Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="space-y-4 sm:space-y-5"
                >
                     <motion.label
                       animate={{ opacity: [0.6, 1, 0.6] }}
                       transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                       className="text-xs sm:text-sm font-ui uppercase tracking-[0.3em] text-zinc-500 font-bold"
                     >
                       Fantasía Inicial
                     </motion.label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                        {THEMES.map((theme, idx) => (
                            <motion.button
                                key={theme}
                              initial={{ opacity: 0, y: 30, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ 
                                delay: 0.9 + idx * 0.1,
                                type: "spring",
                                stiffness: 150,
                                damping: 12
                              }}
                              whileHover={{ 
                                scale: 1.05, 
                                y: -4,
                                transition: { duration: 0.2 }
                              }}
                              whileTap={{ scale: 0.95 }}
                                onClick={() => setGameState({...gameState, theme})}
                              className={`text-left p-4 sm:p-5 md:p-6 rounded-xl border-2 transition-all duration-500 relative overflow-hidden group touch-manipulation min-h-[56px] sm:min-h-[64px] ${
                                    gameState.theme === theme
                                  ? 'bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-600 text-red-100 shadow-[0_0_30px_rgba(220,38,38,0.3)]'
                                  : 'bg-zinc-900/20 border-zinc-700/50 text-gray-400 hover:border-red-800/50 hover:text-gray-200 hover:bg-zinc-800/30'
                              }`}
                            >
                                <motion.div
                                  animate={gameState.theme === theme ? { 
                                    opacity: 1,
                                    scale: 1.1
                                  } : { 
                                    opacity: 0,
                                    scale: 1
                                  }}
                                  transition={{ duration: 0.4 }}
                                  className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-red-700/10 to-transparent"
                                />
                                <motion.div
                                  animate={gameState.theme === theme ? {
                                    boxShadow: "0 0 20px rgba(220, 38, 38, 0.4)"
                                  } : {}}
                                  className="absolute inset-0 rounded-xl"
                                />
                                <motion.span
                                  animate={gameState.theme === theme ? {
                                    color: "#fca5a5",
                                    fontWeight: 600
                                  } : {}}
                                  className="font-serif text-base sm:text-lg md:text-xl block relative z-10 transition-all"
                                >
                                  {theme}
                                </motion.span>
                                {gameState.theme === theme && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"
                                  />
                                )}
                            </motion.button>
                        ))}
                     </div>
                </motion.div>

                {/* Start Button */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="pt-6 sm:pt-8 md:pt-10 pb-4"
                >
                    <motion.button
                      whileHover={{ 
                        scale: 1.03,
                        boxShadow: "0 10px 40px rgba(220, 38, 38, 0.4)"
                      }}
                      whileTap={{ scale: 0.97 }}
                        onClick={handleStartGame}
                        disabled={!gameState.playerName || gameState.isLoading}
                      className={`w-full py-5 sm:py-6 md:py-7 rounded-lg font-display font-bold tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-base sm:text-lg md:text-xl transition-all relative overflow-hidden group min-h-[60px] sm:min-h-[64px] touch-manipulation ${
                            gameState.isLoading 
                            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                          : gameState.playerName
                          ? 'bg-gradient-to-r from-white via-zinc-100 to-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                        <motion.div
                          animate={gameState.playerName && !gameState.isLoading ? {
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                          } : {}}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          style={{ backgroundSize: "200% 100%" }}
                        />
                        {gameState.isLoading ? (
                            <motion.span
                              animate={{ opacity: [1, 0.6, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base md:text-lg relative z-10"
                            >
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                  <IconSparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                                </motion.span>
                                <span className="hidden sm:inline">SEDUCIENDO A LA IA...</span>
                                <span className="sm:hidden">CARGANDO...</span>
                            </motion.span>
                        ) : (
                            <motion.span
                              animate={gameState.playerName ? {
                                scale: [1, 1.02, 1]
                              } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="flex items-center justify-center gap-3 sm:gap-4 relative z-10"
                            >
                                <span className="text-sm sm:text-base md:text-lg">COMENZAR EXPERIENCIA</span>
                                <motion.span
                                  animate={gameState.playerName ? {
                                    x: [0, 5, 0],
                                    opacity: [0.7, 1, 0.7]
                                  } : {}}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="text-xl sm:text-2xl"
                                >
                                  →
                                </motion.span>
                            </motion.span>
                        )}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={gameState.playerName && !gameState.isLoading ? {
                            width: "100%"
                          } : {
                            width: 0
                          }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"
                        />
                    </motion.button>
                </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- PLAYING MODE ---
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="playing"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen bg-[#050505] text-[#d4d4d4] flex flex-col font-serif relative"
      >
      
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-40 glass-panel"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex flex-col cursor-default">
            <h1 className="text-base sm:text-lg md:text-xl text-red-700 font-display font-bold tracking-widest leading-none drop-shadow-sm">FANTASÍAS</h1>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-[0.4em] ml-0.5 opacity-80">Infinitas</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="text-[9px] sm:text-[10px] font-ui text-zinc-600 hover:text-red-500 active:text-red-400 tracking-[0.2em] uppercase transition-colors border border-transparent hover:border-red-900/30 active:border-red-900/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-sm min-h-[36px] touch-manipulation"
          >
            Terminar
          </motion.button>
        </div>
      </motion.header>

      {/* Main Story Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto pt-20 sm:pt-24 md:pt-32 px-4 sm:px-6 md:px-12 relative z-10 pb-4">
        <div className="space-y-8 sm:space-y-12 md:space-y-16">
            
            {/* Story History */}
            <AnimatePresence>
            {gameState.history.map((entry, idx) => {
                const isModel = entry.role === 'model';
                const isLast = idx === gameState.history.length - 1;
                
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                      delay: isLast ? 0.2 : 0
                    }}
                    className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                  >
                        {isModel ? (
                      <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 1, delay: isLast ? 0.3 : 0 }}
                        className="w-full"
                      >
                                <div className="prose prose-invert max-w-none">
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: isLast ? 0.5 : 0 }}
                            className="text-base sm:text-lg md:text-2xl leading-7 sm:leading-8 md:leading-9 text-gray-200 font-serif antialiased first-letter:text-3xl sm:first-letter:text-4xl md:first-letter:text-5xl first-letter:font-display first-letter:text-red-700 first-letter:float-left first-letter:mr-2 sm:first-letter:mr-3 first-letter:mt-[-2px] sm:first-letter:mt-[-4px] md:first-letter:mt-[-6px]"
                          >
                                        {entry.text}
                          </motion.p>
                                </div>
                                {/* Elegant Divider */}
                                {idx < gameState.history.length - 1 && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="w-full flex justify-center mt-12 md:mt-16 mb-4 opacity-30"
                          >
                                        <div className="h-px w-20 md:w-32 bg-gradient-to-r from-transparent via-red-800 to-transparent"></div>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, x: isModel ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-2 mb-6 sm:mb-8 md:mb-10 max-w-[92%] sm:max-w-[90%] md:max-w-[85%]"
                      >
                        <div className="text-right border-r border-red-800 pr-3 sm:pr-4 md:pr-6 py-2 bg-gradient-to-l from-red-950/10 to-transparent">
                          <p className="text-red-200/90 italic text-sm sm:text-base md:text-xl font-serif">
                                        "{entry.text}"
                                    </p>
                                </div>
                      </motion.div>
                        )}
                  </motion.div>
                );
            })}
            </AnimatePresence>

            {/* Loading State */}
            <AnimatePresence>
            {gameState.isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex justify-center py-6 sm:py-8 md:py-12"
                >
                  <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-red-800 opacity-50 w-6 h-6 sm:w-8 sm:h-8"
                    >
                      <IconSparkles />
                    </motion.div>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[9px] sm:text-[10px] font-ui uppercase tracking-[0.3em] text-zinc-600 text-center px-4"
                    >
                      Escribiendo el deseo...
                    </motion.span>
                     </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Error State */}
            <AnimatePresence>
            {gameState.error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-red-950/10 border border-red-900/30 p-4 sm:p-6 md:p-8 rounded text-center backdrop-blur-sm"
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-red-400 mb-4 sm:mb-6 font-serif italic text-sm sm:text-base md:text-lg px-2"
                  >
                    {gameState.error}
                  </motion.p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                        onClick={() => setGameState(p => ({...p, isLoading: false, error: null}))} 
                    className="text-[10px] sm:text-xs font-ui bg-red-900 text-red-100 px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-sm uppercase tracking-widest hover:bg-red-800 active:bg-red-700 transition-colors shadow-lg shadow-red-900/20 min-h-[44px] touch-manipulation"
                    >
                        Intentar de Nuevo
                  </motion.button>
                </motion.div>
            )}
            </AnimatePresence>

             {/* Game Over */}
            <AnimatePresence>
            {(gameState.currentSegment?.isEnding || step === AppStep.GAME_OVER) && !gameState.isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center py-8 sm:py-12 md:py-16 border-t border-zinc-900 mt-6 sm:mt-8 md:mt-12"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="inline-block p-3 sm:p-4 border border-red-900/40 rounded-full mb-4 sm:mb-6 md:mb-8 bg-red-950/20 shadow-[0_0_30px_rgba(127,29,29,0.2)]"
                  >
                        <IconHeart />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl sm:text-3xl md:text-4xl font-display text-white mb-3 sm:mb-4 px-4"
                  >
                    Fin de la Escena
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-500 font-serif italic text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-10 px-4"
                  >
                    La fantasía ha llegado a su clímax.
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                        onClick={resetGame}
                    className="bg-zinc-100 text-black font-display font-bold text-[10px] sm:text-xs md:text-sm py-3 sm:py-3 md:py-4 px-6 sm:px-8 md:px-12 tracking-[0.25em] hover:bg-white active:bg-zinc-200 transition-all shadow-lg hover:shadow-white/20 min-h-[44px] touch-manipulation"
                    >
                        NUEVA HISTORIA
                  </motion.button>
                </motion.div>
            )}
            </AnimatePresence>
            
            {/* Massive Spacer to ensure text is never hidden behind the fixed footer */}
            <div ref={endRef} className="h-[50vh] sm:h-[45vh] w-full pointer-events-none" />
        </div>
      </main>

      {/* Footer Choices Area */}
      <AnimatePresence>
      {!gameState.isLoading && gameState.currentSegment && !gameState.currentSegment.isEnding && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          >
            {/* Gradient Mask for smooth fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-20 sm:h-24 md:h-32 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent"
            ></motion.div>
            
            {/* Control Panel */}
            <div className="bg-[#050505] border-t border-zinc-900/50 pb-4 sm:pb-6 md:pb-8 pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pointer-events-auto safe-area-inset-bottom">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-3xl mx-auto"
                >
                    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2 sm:mb-3 md:mb-5 opacity-40">
                         <div className="h-px bg-zinc-800 flex-1"></div>
                         <span className="text-[8px] sm:text-[9px] md:text-[10px] font-ui uppercase tracking-[0.3em] text-zinc-500">Elige tu destino</span>
                         <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>
                    
                    <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-3">
                        <AnimatePresence>
                        {gameState.currentSegment.choices.map((choice, idx) => (
                            <motion.button
                                key={idx}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{
                                duration: 0.4,
                                delay: idx * 0.1,
                                ease: [0.16, 1, 0.3, 1]
                              }}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                                onClick={() => handleChoice(choice.text)}
                              className="group relative w-full text-left overflow-hidden touch-manipulation min-h-[56px] sm:min-h-[60px]"
                            >
                                {/* Card Background */}
                                <div className="absolute inset-0 bg-zinc-900/40 border border-zinc-800/60 transition-all duration-500 group-active:border-red-900/60 group-active:bg-red-950/20 md:group-hover:border-red-900/60 md:group-hover:bg-red-950/20 md:group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"></div>
                                
                                {/* Content */}
                                <div className="relative p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 z-10">
                                    <span className="font-serif text-sm sm:text-base md:text-xl text-gray-300 md:text-gray-400 group-active:text-gray-100 md:group-hover:text-gray-100 transition-colors duration-300 group-active:drop-shadow-sm md:group-hover:drop-shadow-sm pr-2 flex-1">
                                        {choice.text}
                                    </span>
                                    <span className={`
                                        text-[7px] sm:text-[8px] md:text-[9px] font-ui uppercase tracking-[0.2em] px-2 py-1 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-sm border transition-all duration-300 whitespace-nowrap self-start sm:self-auto
                                        ${choice.tone.toLowerCase().includes('aggressive') || choice.tone.toLowerCase().includes('brusco') ? 'border-red-900/30 text-red-500/70 group-active:bg-red-900/20 md:group-hover:bg-red-900/20' : 
                                          choice.tone.toLowerCase().includes('romantic') ? 'border-purple-900/30 text-purple-400/70 group-active:bg-purple-900/20 md:group-hover:bg-purple-900/20' :
                                          'border-zinc-800 text-zinc-500 group-active:border-zinc-600 md:group-hover:border-zinc-600'}
                                    `}>
                                        {choice.tone}
                                    </span>
                                </div>
                                
                                {/* Active/Hover Glow Line */}
                                <motion.div
                                  initial={{ width: 0 }}
                                  whileHover={{ width: "100%" }}
                                  transition={{ duration: 0.5, ease: "easeInOut" }}
                                  className="absolute bottom-0 left-0 h-[1px] bg-red-600"
                                ></motion.div>
                            </motion.button>
                          ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
          </motion.div>
      )}
      </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default App;