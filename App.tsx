
import React, { useState, useEffect, useRef } from 'react';
import { GENRES, MOODS, VOCAL_OPTIONS, ICONS } from './constants';
import { GeneratedPrompt, PromptFormData, Variation } from './types';
import { generateSunoPrompts } from './geminiService';

const App: React.FC = () => {
  const [formData, setFormData] = useState<PromptFormData>({
    description: '',
    genre: GENRES[0],
    mood: MOODS[0],
    vocals: VOCAL_OPTIONS[0]
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedPrompt[]>([]);
  const [currentResult, setCurrentResult] = useState<GeneratedPrompt | null>(null);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [editedStyle, setEditedStyle] = useState('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('suno_history_cyber_synth');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setFormData(prev => ({
          ...prev,
          description: (prev.description + ' ' + transcript.trim()).trim()
        }));
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Sync editedStyle when active variation changes
  useEffect(() => {
    if (currentResult && currentResult.variations[activeVariationIndex]) {
      setEditedStyle(currentResult.variations[activeVariationIndex].style);
    }
  }, [currentResult, activeVariationIndex]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("SYS_ERR: Voice input not supported in this terminal.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const saveToHistory = (item: GeneratedPrompt) => {
    const newHistory = [item, ...history].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('suno_history_cyber_synth', JSON.stringify(newHistory));
  };

  const updateHistoryItem = (updatedItem: GeneratedPrompt) => {
    const newHistory = history.map(item => item.id === updatedItem.id ? updatedItem : item);
    setHistory(newHistory);
    localStorage.setItem('suno_history_cyber_synth', JSON.stringify(newHistory));
  };

  const getFriendlyErrorMessage = (err: any) => {
    const msg = err?.message || String(err);
    if (msg.includes('401')) return "AUTH_ERR: Invalid Access Key.";
    if (msg.includes('429')) return "QUOTA_ERR: Signal Threshold Reached.";
    if (msg.includes('safety')) return "SAFETY_ERR: Content Protocol Mismatch.";
    return "SYS_ERR: Hardware Interface Failure.";
  };

  const executeGeneration = async (inputs: PromptFormData, excludeStyles: string[] = []) => {
    setIsGenerating(true);
    setError(null);
    try {
      const aiResult = await generateSunoPrompts(inputs, excludeStyles);
      const newPrompt: GeneratedPrompt = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        input: { ...inputs },
        variations: aiResult.variations
      };
      setCurrentResult(newPrompt);
      saveToHistory(newPrompt);
      setActiveVariationIndex(0);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeGeneration(formData);
  };

  const handleSurpriseMe = () => {
    const randomGenre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const randomVocal = VOCAL_OPTIONS[Math.floor(Math.random() * VOCAL_OPTIONS.length)];
    
    const newInputs = {
      description: '', 
      genre: randomGenre,
      mood: randomMood,
      vocals: randomVocal
    };
    
    setFormData(newInputs);
    executeGeneration(newInputs);
  };

  const handleRegenerate = () => {
    if (currentResult) {
      // Pass the current styles as 'excludeStyles' to force the AI to be distinct from what is currently shown.
      const currentStyles = currentResult.variations.map(v => v.style);
      executeGeneration(currentResult.input, currentStyles);
    }
  };

  const handleSaveModifiedStyle = () => {
    if (!currentResult) return;
    
    const updatedVariations = [...currentResult.variations];
    updatedVariations[activeVariationIndex] = {
      ...updatedVariations[activeVariationIndex],
      style: editedStyle
    };
    
    const updatedResult = {
      ...currentResult,
      variations: updatedVariations
    };
    
    setCurrentResult(updatedResult);
    updateHistoryItem(updatedResult);
    
    setCopySuccess('save_mod');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const activeVariation = currentResult?.variations[activeVariationIndex];

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* ANALOG HEADER PANEL */}
      <header className="w-full max-w-6xl mb-10 synth-panel cyber-accent-cyan flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="screw screw-tl"></div>
        <div className="screw screw-tr"></div>
        <div className="screw screw-bl"></div>
        <div className="screw screw-br"></div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className={`status-led ${isGenerating ? 'on-green' : (isListening ? 'on-magenta' : 'on-cyan')}`}></div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Power</span>
          </div>
          <div className="h-16 w-1 bg-slate-800 rounded-full"></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono uppercase tracking-tighter leading-none text-white">
              PROMPT <span className="text-cyan-400">ARCHITECT</span>
            </h1>
            <p className="text-cyan-900 font-mono text-[10px] uppercase mt-1">Suno AI Signal Processor // Model: LRA-X1</p>
          </div>
        </div>
        
        <div className="flex gap-8">
           <div className="knob-container">
              <div className="retro-knob" style={{transform: 'rotate(45deg)'}}></div>
              <span className="text-[9px] font-bold text-cyan-900 uppercase">Input Gain</span>
           </div>
           <div className="knob-container">
              <div className="retro-knob" style={{transform: 'rotate(-30deg)'}}></div>
              <span className="text-[9px] font-bold text-cyan-900 uppercase">Resonance</span>
           </div>
           <div className="knob-container">
              <div className="retro-knob" style={{transform: 'rotate(120deg)'}}></div>
              <span className="text-[9px] font-bold text-cyan-900 uppercase">Master</span>
           </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* INPUT MODULE */}
        <div className="lg:col-span-5 space-y-6">
          <section className="synth-panel cyber-accent-cyan">
            <div className="screw screw-tl"></div>
            <div className="screw screw-tr"></div>
            <div className="screw screw-bl"></div>
            <div className="screw screw-br"></div>
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <ICONS.Sparkles /> Module_01: Input
              </h2>
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-cyan-950"></div>
                <div className="w-1 h-3 bg-cyan-950"></div>
                <div className={`w-1 h-3 ${isListening ? 'bg-magenta-500 shadow-[0_0_5px_magenta]' : 'bg-cyan-500 shadow-[0_0_5px_cyan]'}`}></div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Song Description Buffer</label>
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    title={isListening ? "Stop Voice Input" : "Start Voice Input"}
                    className={`p-1 border border-slate-800 transition-all ${isListening ? 'text-magenta-500 border-magenta-500 animate-pulse' : 'text-slate-500 hover:text-cyan-400'}`}
                  >
                    {isListening ? <ICONS.MicOff /> : <ICONS.Mic />}
                  </button>
                </div>
                <textarea
                  className="w-full bg-black border border-slate-800 p-4 font-mono text-sm leading-relaxed text-cyan-100 placeholder-slate-800 focus:border-cyan-500 focus:ring-0 outline-none"
                  rows={4}
                  placeholder="LEAVE EMPTY FOR TOTAL SURPRISE..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Genre Oscillator</label>
                  <select
                    className="w-full bg-black border border-slate-800 p-2 text-xs font-mono"
                    value={formData.genre}
                    onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                  >
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Mood Envelope</label>
                  <select
                    className="w-full bg-black border border-slate-800 p-2 text-xs font-mono"
                    value={formData.mood}
                    onChange={(e) => setFormData(prev => ({ ...prev, mood: e.target.value }))}
                  >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Vocal Synthesis</label>
                <select
                  className="w-full bg-black border border-slate-800 p-2 text-xs font-mono"
                  value={formData.vocals}
                  onChange={(e) => setFormData(prev => ({ ...prev, vocals: e.target.value }))}
                >
                  {VOCAL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="cyber-button text-xs flex-1 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                >
                  Surprise Me
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="cyber-button primary text-xs flex-1"
                >
                  {isGenerating ? 'Synthesizing...' : 'Generate Sets'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 led-display border-red-900/50 text-red-500 text-[10px] uppercase">
                {error}
              </div>
            )}
          </section>

          {/* HISTORY LOG MODULE */}
          <section className="synth-panel opacity-60">
            <div className="screw screw-tl"></div>
            <div className="screw screw-tr"></div>
            <div className="screw screw-bl"></div>
            <div className="screw screw-br"></div>
            
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <ICONS.History /> Log_File_Buffer
            </h2>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar font-mono text-[10px]">
              {history.length === 0 ? (
                <div className="text-slate-800">EMPTY_LOG...</div>
              ) : history.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-2 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-all ${currentResult?.id === item.id ? 'border-cyan-500 bg-cyan-500/5' : ''}`}
                  onClick={() => { setCurrentResult(item); setActiveVariationIndex(0); }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-700">[{item.input.genre}]</span>
                    <span className="text-slate-700">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* OUTPUT MODULE */}
        <div className="lg:col-span-7 space-y-8">
          {currentResult && activeVariation ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              
              {/* PRIMARY OUTPUT PANEL */}
              <section className="synth-panel cyber-accent-magenta">
                <div className="screw screw-tl"></div>
                <div className="screw screw-tr"></div>
                <div className="screw screw-bl"></div>
                <div className="screw screw-br"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <h2 className="text-sm font-bold text-magenta-500 uppercase tracking-widest flex items-center gap-2">
                    Module_02: Signal_Set
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-black p-1 border border-slate-800">
                      {currentResult.variations.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveVariationIndex(idx)}
                          className={`px-3 py-1 text-[10px] font-bold font-mono transition-all ${
                            activeVariationIndex === idx 
                            ? 'bg-magenta-500 text-black shadow-[0_0_10px_magenta]' 
                            : 'text-slate-600 hover:text-magenta-400'
                          }`}
                        >
                          SET_{idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                      className="cyber-button text-[10px] border-magenta-900 text-magenta-900 hover:text-magenta-400 hover:border-magenta-400 flex items-center gap-2 px-3 group"
                      title="Generate new variations avoiding these ones"
                    >
                      {isGenerating ? <ICONS.Loader /> : <ICONS.Rotate />}
                      <span className="hidden md:inline group-hover:underline">Regen Variations</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Style Instruction String (Editable)</label>
                       <div className="flex gap-2">
                          <div className={`status-led ${editedStyle !== activeVariation.style ? 'on-yellow' : 'on-magenta'}`}></div>
                          <span className={`text-[9px] font-bold uppercase ${editedStyle !== activeVariation.style ? 'text-yellow-500' : 'text-magenta-900'}`}>
                            {editedStyle !== activeVariation.style ? 'Modified' : 'Ready'}
                          </span>
                       </div>
                    </div>
                    <div className="led-display border-magenta-900/30 text-magenta-100 flex flex-col md:flex-row gap-4 items-center group">
                      <textarea
                        className="flex-1 w-full bg-transparent border-none font-mono text-xs leading-relaxed italic resize-none focus:ring-0 focus:outline-none placeholder-magenta-900"
                        rows={2}
                        value={editedStyle}
                        onChange={(e) => setEditedStyle(e.target.value)}
                        placeholder="INPUT_STYLE_DATA..."
                      />
                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                        <button
                          onClick={handleSaveModifiedStyle}
                          disabled={editedStyle === activeVariation.style}
                          className={`cyber-button text-[10px] flex-1 border-yellow-500 text-yellow-500 disabled:opacity-30 disabled:border-slate-800 disabled:text-slate-800 ${copySuccess === 'save_mod' ? 'bg-green-600 text-white border-green-600' : ''}`}
                        >
                          {copySuccess === 'save_mod' ? 'SAVED' : 'SAVE MOD'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(editedStyle, 'style')}
                          className={`cyber-button text-[10px] flex-1 border-magenta-500 text-magenta-500 ${copySuccess === 'style' ? 'bg-green-600 text-white border-green-600 shadow-green-500/20' : ''}`}
                        >
                          {copySuccess === 'style' ? 'LOADED' : 'COPY'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Context_Description_Metatag</label>
                    <div className="led-display border-slate-800 text-cyan-200/80 flex gap-4 items-center">
                      <p className="flex-1 font-mono text-[11px] italic">
                        "{activeVariation.description}"
                      </p>
                      <button
                        onClick={() => copyToClipboard(activeVariation.description, 'desc')}
                        className={`cyber-button text-[10px] border-cyan-800 text-cyan-800 hover:text-cyan-400 hover:border-cyan-400 ${copySuccess === 'desc' ? 'bg-green-600 text-white border-green-600' : ''}`}
                      >
                        {copySuccess === 'desc' ? 'OK' : 'CPY'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* LYRICS PANEL */}
              <section className="synth-panel cyber-accent-yellow">
                <div className="screw screw-tl"></div>
                <div className="screw screw-tr"></div>
                <div className="screw screw-bl"></div>
                <div className="screw screw-br"></div>
                
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest">Module_03: Lyric_Matrix</h2>
                  <button
                    onClick={() => copyToClipboard(activeVariation.lyrics, 'lyrics')}
                    className={`cyber-button text-[10px] border-yellow-500 text-yellow-500 ${copySuccess === 'lyrics' ? 'bg-green-600 text-white border-green-600' : ''}`}
                  >
                    {copySuccess === 'lyrics' ? 'STORED' : 'COPY_ALL'}
                  </button>
                </div>
                <div className="led-display text-yellow-100/70 p-6 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {activeVariation.lyrics}
                </div>
              </section>
            </div>
          ) : isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center p-12 synth-panel">
               <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-cyan-900 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(0,243,255,0.3)]"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-cyan-500 animate-pulse">
                    <ICONS.Music />
                  </div>
               </div>
               <div className="text-center font-mono space-y-2">
                  <p className="text-cyan-400 text-sm tracking-widest uppercase">Signal Synthesis In Progress...</p>
                  <p className="text-slate-800 text-[10px]">ENCODING_LYRIC_BUFFERS</p>
                  <div className="flex justify-center gap-2 mt-4">
                     {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-6 bg-cyan-900 animate-pulse" style={{animationDelay: `${i*0.1}s`}}></div>)}
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full synth-panel flex flex-col items-center justify-center text-slate-800 text-center uppercase tracking-[0.2em] font-mono py-32">
              <div className="p-8 border border-dashed border-slate-900 rounded-full mb-8">
                <ICONS.Music />
              </div>
              <p className="text-xs">System Status: Standby</p>
              <p className="text-[10px] mt-2 text-slate-900">Await Signal Input from Module_01</p>
              <p className="text-[9px] mt-4 text-cyan-900 animate-pulse">TIP: Click SURPRISE ME for Wildcard Mode</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 py-8 border-t border-slate-900/50 w-full max-w-6xl flex flex-col md:flex-row justify-between items-center font-mono text-[9px] text-slate-800 uppercase tracking-widest gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="status-led on-magenta"></div>
             <span>Link Established</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="status-led on-cyan"></div>
             <span>Encrypted</span>
          </div>
        </div>
        <span>© 2025 // Neural_Architect_v3 // Cybernetic_Signal_Processing</span>
        <div className="flex items-center gap-2">
           <span>Signal: 100%</span>
           <div className="w-20 h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="w-4/5 h-full bg-cyan-950"></div>
           </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a20; border-radius: 10px; border: 1px solid #333; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2a2a35; }
        
        .on-yellow { background: #eab308; box-shadow: 0 0 10px #eab308; }
      `}</style>
    </div>
  );
};

export default App;
