import React, { useState, useRef, useEffect } from 'react';
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
    <button
      onClick={() => onClick(value)}
      className={`relative p-3 md:p-5 rounded-xl border transition-all duration-500 flex flex-col items-center justify-center gap-2 group overflow-hidden ${
        current === value 
          ? 'bg-red-950/20 border-red-800 shadow-[0_0_20px_rgba(185,28,28,0.2)] scale-[1.02]' 
          : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40'
      }`}
    >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 transition-opacity duration-700 ${current === value ? 'opacity-100' : 'group-hover:opacity-30'}`} />
        
        {/* Animated text */}
        <span className={`relative font-ui text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase z-10 transition-colors duration-300 ${current === value ? 'text-red-400 font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>
          {label}
        </span>
        
        {/* Active Indicator */}
        {current === value && (
            <div className="absolute bottom-1.5 md:bottom-2 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
        )}
    </button>
  );

  // --- VIEWS ---

  if (step === AppStep.AGE_GATE) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-black">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542259681-d7031c5521eb?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-20 scale-105 animate-[pulseGlow_10s_infinite]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
        
        <div className="relative z-10 max-w-lg w-full text-center p-6 md:p-10 slide-up border border-red-900/10 rounded-2xl backdrop-blur-sm">
          <div className="mb-8 md:mb-10 flex justify-center">
             <div className="w-16 h-16 md:w-20 md:h-20 border border-red-900/50 rounded-full flex items-center justify-center pulse-glow bg-black/50">
                <span className="text-2xl md:text-3xl text-red-600 font-display">18+</span>
             </div>
          </div>
          
          <h1 className="text-4xl md:text-7xl text-white mb-6 font-display font-bold tracking-tighter drop-shadow-2xl text-shadow-red leading-tight">
            Fantasías <span className="text-red-700 italic font-serif block md:inline">Infinitas</span>
          </h1>
          
          <p className="text-gray-400 mb-10 md:mb-12 text-base md:text-xl font-serif leading-relaxed px-2 md:px-4 opacity-80">
            Una inmersión narrativa donde el deseo guía el camino. <br className="hidden md:block"/> Contenido explícito.
          </p>
          
          <button 
            onClick={handleAgeVerify}
            className="group relative px-10 md:px-14 py-4 md:py-5 bg-transparent overflow-hidden rounded-sm transition-all hover:scale-105 duration-500 w-full md:w-auto"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 blur-md group-hover:bg-red-800/30 transition-all"></div>
            <div className="absolute inset-0 border border-red-800/40 group-hover:border-red-500/60 transition-colors duration-500"></div>
            <span className="relative text-red-100 font-display tracking-[0.3em] font-bold group-hover:text-white transition-colors flex items-center gap-3 justify-center text-sm md:text-base">
              ENTRAR <IconFlame />
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (step === AppStep.SETUP) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 md:p-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 slide-up">
            
            {/* Left Column: Atmospheric Side Panel (Top on Mobile) */}
            <div className="lg:col-span-4 flex flex-col justify-center border-b border-red-900/20 pb-8 pl-0 text-center lg:text-left lg:border-b-0 lg:border-l-2 lg:border-red-900/20 lg:pl-8 relative lg:order-last">
                 <div className="hidden lg:block absolute -left-[3px] top-1/3 bottom-1/3 w-1 bg-gradient-to-b from-transparent via-red-800 to-transparent blur-[2px]"></div>
                <h2 className="text-4xl md:text-6xl text-white font-display mb-4 md:mb-6 leading-none">
                   Diseña <br/> <span className="text-red-700 italic">Tu Deseo</span>
                </h2>
                <p className="text-gray-500 font-serif text-lg md:text-xl leading-relaxed">
                    "La anticipación es la forma más pura de placer. Cuéntame quién eres y déjame prepararte..."
                </p>
                <div className="mt-8 md:mt-12 opacity-30 text-red-500 animate-pulse flex justify-center lg:justify-start">
                    <IconFeather />
                </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="lg:col-span-8 space-y-8 md:space-y-10">
                
                {/* Name Input */}
                <div className="space-y-4 group">
                    <label className="text-xs font-ui uppercase tracking-[0.2em] text-red-900/70 group-hover:text-red-700 transition-colors">Nombre del Protagonista</label>
                    <input 
                        type="text" 
                        value={gameState.playerName}
                        onChange={(e) => setGameState({...gameState, playerName: e.target.value})}
                        className="w-full bg-transparent border-b border-zinc-800 py-3 md:py-4 text-2xl md:text-4xl text-white font-serif focus:border-red-800 focus:outline-none placeholder-zinc-800 transition-all focus:pl-4"
                        placeholder="Escribe aquí..."
                    />
                </div>

                {/* Identity & Orientation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    <div className="space-y-3 md:space-y-4">
                        <label className="text-xs font-ui uppercase tracking-[0.2em] text-zinc-600">Identidad</label>
                        {/* Mobile: Grid cols 3 for horizontal buttons */}
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3">
                             {['Mujer', 'Hombre', 'No Binario'].map(g => 
                                renderSelectionCard(g, g, gameState.gender, (v) => setGameState({...gameState, gender: v}))
                             )}
                        </div>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                        <label className="text-xs font-ui uppercase tracking-[0.2em] text-zinc-600">Interés</label>
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3">
                            {['Hombres', 'Mujeres', 'Todo'].map(o => 
                                renderSelectionCard(o, o, gameState.orientation, (v) => setGameState({...gameState, orientation: v}))
                             )}
                        </div>
                    </div>
                </div>

                {/* Theme Selection */}
                <div className="space-y-3 md:space-y-4">
                     <label className="text-xs font-ui uppercase tracking-[0.2em] text-zinc-600">Fantasía Inicial</label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {THEMES.map(theme => (
                            <button
                                key={theme}
                                onClick={() => setGameState({...gameState, theme})}
                                className={`text-left p-4 md:p-5 rounded-lg border transition-all duration-300 relative overflow-hidden group ${
                                    gameState.theme === theme
                                    ? 'bg-zinc-900 border-red-800 text-red-100'
                                    : 'bg-transparent border-zinc-800 text-gray-500 hover:border-zinc-700 hover:text-gray-300'
                                }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r from-red-900/10 to-transparent transition-opacity duration-500 ${gameState.theme === theme ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
                                <span className="font-serif text-base md:text-lg block relative z-10">{theme}</span>
                            </button>
                        ))}
                     </div>
                </div>

                {/* Start Button */}
                <div className="pt-4 md:pt-8 pb-4">
                    <button 
                        onClick={handleStartGame}
                        disabled={!gameState.playerName || gameState.isLoading}
                        className={`w-full py-5 md:py-6 rounded-sm font-display font-bold tracking-[0.2em] md:tracking-[0.3em] text-base md:text-lg transition-all relative overflow-hidden group ${
                            gameState.isLoading 
                            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                    >
                        {gameState.isLoading ? (
                            <span className="animate-pulse flex items-center justify-center gap-3">
                                <IconSparkles /> SEDUCIENDO A LA IA...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                COMENZAR EXPERIENCIA <span className="opacity-0 group-hover:opacity-100 transition-opacity -ml-4 group-hover:ml-0">→</span>
                            </span>
                        )}
                        <div className="absolute bottom-0 left-0 h-[2px] bg-red-600 w-0 group-hover:w-full transition-all duration-700 ease-in-out"></div>
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- PLAYING MODE ---
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] flex flex-col font-serif relative">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-40 glass-panel transition-all duration-500">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex flex-col cursor-default">
            <h1 className="text-lg md:text-xl text-red-700 font-display font-bold tracking-widest leading-none drop-shadow-sm">FANTASÍAS</h1>
            <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-[0.4em] ml-0.5 opacity-80">Infinitas</span>
          </div>
          <button onClick={resetGame} className="text-[10px] font-ui text-zinc-600 hover:text-red-500 tracking-[0.2em] uppercase transition-colors border border-transparent hover:border-red-900/30 px-3 py-1 rounded-sm">
            Terminar
          </button>
        </div>
      </header>

      {/* Main Story Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto pt-24 md:pt-32 px-5 md:px-12 relative z-10">
        <div className="space-y-12 md:space-y-16">
            
            {/* Story History */}
            {gameState.history.map((entry, idx) => {
                const isModel = entry.role === 'model';
                const isLast = idx === gameState.history.length - 1;
                
                return (
                    <div key={idx} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                        {isModel ? (
                            <div className={`w-full ${isLast ? 'text-reveal' : 'fade-in'}`}>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-lg md:text-2xl leading-8 md:leading-9 text-gray-200 font-serif antialiased first-letter:text-4xl md:first-letter:text-5xl first-letter:font-display first-letter:text-red-700 first-letter:float-left first-letter:mr-3 first-letter:mt-[-4px] md:first-letter:mt-[-6px]">
                                        {entry.text}
                                    </p>
                                </div>
                                {/* Elegant Divider */}
                                {idx < gameState.history.length - 1 && (
                                    <div className="w-full flex justify-center mt-12 md:mt-16 mb-4 opacity-30">
                                        <div className="h-px w-20 md:w-32 bg-gradient-to-r from-transparent via-red-800 to-transparent"></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-2 mb-8 md:mb-10 max-w-[90%] md:max-w-[85%] fade-in">
                                <div className="text-right border-r border-red-800 pr-4 md:pr-6 py-2 bg-gradient-to-l from-red-950/10 to-transparent">
                                    <p className="text-red-200/90 italic text-base md:text-xl font-serif">
                                        "{entry.text}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Loading State */}
            {gameState.isLoading && (
                <div className="flex justify-center py-8 md:py-12 fade-in">
                     <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin text-red-800 opacity-50"><IconSparkles /></div>
                        <span className="text-[10px] font-ui uppercase tracking-[0.3em] text-zinc-600 animate-pulse">Escribiendo el deseo...</span>
                     </div>
                </div>
            )}

            {/* Error State */}
            {gameState.error && (
                <div className="bg-red-950/10 border border-red-900/30 p-6 md:p-8 rounded text-center backdrop-blur-sm fade-in">
                    <p className="text-red-400 mb-6 font-serif italic text-base md:text-lg">{gameState.error}</p>
                    <button 
                        onClick={() => setGameState(p => ({...p, isLoading: false, error: null}))} 
                        className="text-xs font-ui bg-red-900 text-red-100 px-6 md:px-8 py-3 rounded-sm uppercase tracking-widest hover:bg-red-800 transition-colors shadow-lg shadow-red-900/20"
                    >
                        Intentar de Nuevo
                    </button>
                </div>
            )}

             {/* Game Over */}
            {(gameState.currentSegment?.isEnding || step === AppStep.GAME_OVER) && !gameState.isLoading && (
                 <div className="text-center py-12 md:py-16 slide-up border-t border-zinc-900 mt-8 md:mt-12">
                    <div className="inline-block p-4 border border-red-900/40 rounded-full mb-6 md:mb-8 bg-red-950/20 shadow-[0_0_30px_rgba(127,29,29,0.2)]">
                        <IconHeart />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-display text-white mb-4">Fin de la Escena</h3>
                    <p className="text-gray-500 font-serif italic text-lg md:text-xl mb-8 md:mb-10">La fantasía ha llegado a su clímax.</p>
                    <button 
                        onClick={resetGame}
                        className="bg-zinc-100 text-black font-display font-bold text-xs md:text-sm py-3 md:py-4 px-8 md:px-12 tracking-[0.25em] hover:bg-white hover:scale-105 transition-all shadow-lg hover:shadow-white/20"
                    >
                        NUEVA HISTORIA
                    </button>
                </div>
            )}
            
            {/* Massive Spacer to ensure text is never hidden behind the fixed footer */}
            <div ref={endRef} className="h-[45vh] w-full pointer-events-none" />
        </div>
      </main>

      {/* Footer Choices Area */}
      {!gameState.isLoading && gameState.currentSegment && !gameState.currentSegment.isEnding && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            {/* Gradient Mask for smooth fade */}
            <div className="h-16 md:h-32 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent"></div>
            
            {/* Control Panel */}
            <div className="bg-[#050505] border-t border-zinc-900/50 pb-6 pt-4 px-4 md:px-6 md:pb-8 md:pt-6 pointer-events-auto">
                <div className="max-w-3xl mx-auto slide-up-delay">
                    <div className="flex items-center justify-center gap-4 mb-3 md:mb-5 opacity-40">
                         <div className="h-px bg-zinc-800 flex-1"></div>
                         <span className="text-[9px] md:text-[10px] font-ui uppercase tracking-[0.3em] text-zinc-500">Elige tu destino</span>
                         <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>
                    
                    <div className="flex flex-col gap-2 md:gap-3">
                        {gameState.currentSegment.choices.map((choice, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleChoice(choice.text)}
                                className="group relative w-full text-left overflow-hidden transition-all duration-500 transform active:scale-95 md:hover:scale-[1.01] md:hover:-translate-y-1"
                            >
                                {/* Card Background */}
                                <div className="absolute inset-0 bg-zinc-900/40 border border-zinc-800/60 transition-all duration-500 group-hover:border-red-900/60 group-hover:bg-red-950/20 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"></div>
                                
                                {/* Content */}
                                <div className="relative p-3 md:p-6 flex items-center justify-between z-10">
                                    <span className="font-serif text-base md:text-xl text-gray-300 md:text-gray-400 group-hover:text-gray-100 transition-colors duration-300 group-hover:drop-shadow-sm pr-2">
                                        {choice.text}
                                    </span>
                                    <span className={`
                                        ml-2 md:ml-4 text-[8px] md:text-[9px] font-ui uppercase tracking-[0.2em] px-2 py-1 md:px-3 md:py-1.5 rounded-sm border transition-all duration-300 whitespace-nowrap
                                        ${choice.tone.toLowerCase().includes('aggressive') || choice.tone.toLowerCase().includes('brusco') ? 'border-red-900/30 text-red-500/70 group-hover:bg-red-900/20' : 
                                          choice.tone.toLowerCase().includes('romantic') ? 'border-purple-900/30 text-purple-400/70 group-hover:bg-purple-900/20' :
                                          'border-zinc-800 text-zinc-500 group-hover:border-zinc-600'}
                                    `}>
                                        {choice.tone}
                                    </span>
                                </div>
                                
                                {/* Hover Glow Line */}
                                <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-red-600 group-hover:w-full transition-all duration-700"></div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;