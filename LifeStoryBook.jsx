import React, { useState, useRef, useEffect } from 'react';

const Play = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const Pause = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);
const SkipBack = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><rect x="5" y="4" width="2" height="16"/></svg>
);
const SkipForward = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16"/></svg>
);
const ChevronLeft = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
);

const sampleBook = {
  resident: { name: "Margaret Thompson", preferredName: "Margaret", birthYear: 1937, intro: "A lifetime of stories, told in her own words" },
  stats: { totalStories: 12, totalChapters: 5, totalDuration: "47 min" },
  chapters: [
    {
      id: 1, title: "Early Years", description: "Growing up in Hull during the war years",
      stories: [
        { id: 1, title: "Growing up in Hull", duration: "2:34", durationSeconds: 154, transcript: "I was born in Hull, right near the docks. My father was a fisherman, like his father before him. We lived in a tiny terraced house — you could hear the ships' horns at night. During the war, we'd hide under the stairs when the sirens went. Mum would sing to keep us calm. I still remember the smell of the coal fire and her voice...", recordedDate: "Nov 15, 2024" },
        { id: 2, title: "My father the fisherman", duration: "1:47", durationSeconds: 107, transcript: "Dad would be gone for weeks at a time. When he came home, he'd smell of the sea and tobacco. He'd bring us little presents — shells, sometimes a bit of foreign chocolate. He had the biggest hands I'd ever seen, rough from the ropes. But gentle with us, always gentle...", recordedDate: "Nov 18, 2024" },
      ]
    },
    {
      id: 2, title: "Love & Marriage", description: "Meeting Arthur and building a life together",
      stories: [
        { id: 3, title: "The night I met Arthur", duration: "4:02", durationSeconds: 242, transcript: "It was at the Majestic Ballroom, a Saturday night. I was with my friend Doris. Arthur was standing by the bar with his mates, and he kept looking over. Doris said, 'That one's got his eye on you.' I told her not to be daft. But then the band started playing 'In the Mood,' and he walked right over. 'Would you like to dance?' Just like that. He was so nervous his hand was shaking when he took mine. Fifty-two years later, and I can still feel it...", recordedDate: "Nov 25, 2024" },
        { id: 4, title: "Our wedding day", duration: "3:45", durationSeconds: 225, transcript: "June 14th, 1958. The sun was shining — everyone said it was a sign. My dress was borrowed from my cousin Jean, taken in at the waist. Arthur cried when he saw me coming down the aisle. Big, tough Arthur, crying like a baby. The reception was in the church hall. Spam sandwiches and a cake my aunt made. It was perfect. Absolutely perfect...", recordedDate: "Nov 28, 2024" },
      ]
    },
    {
      id: 3, title: "Family", description: "Raising children and building traditions",
      stories: [
        { id: 5, title: "When Sarah was born", duration: "2:56", durationSeconds: 176, transcript: "Twenty-three hours of labour. Arthur pacing the corridor — they didn't let fathers in back then. When they finally put her in my arms, this tiny little thing with Arthur's nose... I understood everything differently. Every song, every poem, every story about love — I finally understood what they meant...", recordedDate: "Dec 4, 2024" },
        { id: 6, title: "Christmas traditions", duration: "2:41", durationSeconds: 161, transcript: "Christmas Eve was always the same. Arthur would read 'A Christmas Carol' by the fire — he did all the voices. The children in their pyjamas, hot chocolate with too many marshmallows. Then church at midnight, walking home through the snow if we were lucky. Those were the happiest times...", recordedDate: "Dec 8, 2024" },
      ]
    },
    {
      id: 4, title: "Working Life", description: "Forty years of nursing",
      stories: [
        { id: 7, title: "First day as a nurse", duration: "3:15", durationSeconds: 195, transcript: "I was terrified. Absolutely terrified. Sister Blackwood ran that ward like a military operation. 'Thompson!' she'd bark, and I'd jump a foot in the air. But she taught me everything. How to make a bed you could bounce a coin off. How to hold someone's hand when they're frightened. How to keep going when you want to cry...", recordedDate: "Dec 11, 2024" },
      ]
    },
    {
      id: 5, title: "Reflections", description: "Looking back on a life well lived",
      stories: [
        { id: 8, title: "What I've learned", duration: "3:08", durationSeconds: 188, transcript: "If I could tell young people one thing, it would be this: the small moments are the big moments. A cup of tea with someone you love. A letter from a friend. Watching your children sleep. We spend so much time waiting for life to happen, and all along it's happening in the in-between bits...", recordedDate: "Dec 18, 2024" },
        { id: 9, title: "Message to my grandchildren", duration: "2:22", durationSeconds: 142, transcript: "To my darling grandchildren — Emily, James, and little Sophie. Your grandmother loves you more than words can say. Be kind. Be brave. Find someone who makes you laugh. And remember: you come from strong people. Fishermen and nurses and survivors. That strength is in you too...", recordedDate: "Dec 20, 2024" },
      ]
    }
  ]
};

export default function LifeStoryBook({ residentId }) {
  const [view, setView] = useState('cover');
  const [chapter, setChapter] = useState(null);
  const [story, setStory] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [listened, setListened] = useState(new Set());
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const interval = useRef(null);
  const audioRef = useRef(null);

  // Fetch lifebook data from API
  useEffect(() => {
    async function fetchLifebook() {
      try {
        setLoading(true);
        const response = await fetch(`/api/residents/${residentId}/lifebook`);
        if (!response.ok) throw new Error('Failed to load lifebook');
        const data = await response.json();
        setBook(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (residentId) fetchLifebook();
  }, [residentId]);

  // Handle real audio playback
  useEffect(() => {
    if (!audioRef.current || !story?.audioUrl) return;

    const audio = audioRef.current;

    if (playing) {
      audio.play().catch(err => console.error('Audio play failed:', err));
    } else {
      audio.pause();
    }
  }, [playing, story]);

  // Update progress based on actual audio playback
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      setListened(s => new Set([...s, story.id]));
      setProgress(100);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [story]);

  const formatTime = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  
  const navigate = (dir) => {
    if (!book) return;
    const all = book.chapters.flatMap(c => c.stories.map(s => ({...s, ch: c})));
    const idx = all.findIndex(s => s.id === story.id) + dir;
    if (idx >= 0 && idx < all.length) {
      setStory(all[idx]);
      setChapter(all[idx].ch);
      setProgress(0);
      setPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = all[idx].audioUrl;
        audioRef.current.load();
      }
    }
  };

  // Loading state
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-stone-600">Loading lifebook...</p>
      </div>
    </div>
  );

  // Error state
  if (error) return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-serif text-stone-800 mb-2">Unable to load lifebook</h2>
        <p className="text-stone-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-amber-700 text-white px-6 py-2 rounded-full">
          Try Again
        </button>
      </div>
    </div>
  );

  if (!book) return null;

  // Hidden audio element for playback
  const AudioPlayer = story?.audioUrl ? (
    <audio ref={audioRef} src={story.audioUrl} preload="auto" />
  ) : null;

  if (view === 'cover') return (
    <>
      {AudioPlayer}
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-200 to-stone-200 flex items-center justify-center shadow-lg border-4 border-white">
          <span className="text-5xl text-amber-800/50 font-serif">{book.resident.preferredName[0]}</span>
        </div>
        <h1 className="font-serif text-4xl text-stone-800 mb-1">{book.resident.preferredName}'s Story</h1>
        {book.resident.birthYear && <p className="text-stone-400 text-sm mb-4">b. {book.resident.birthYear}</p>}
        <p className="font-serif text-stone-600 italic mb-8">"{book.resident.intro}"</p>
        <div className="flex justify-center gap-6 mb-8 text-stone-600">
          <div><div className="text-xl font-serif text-amber-800">{book.stats.totalStories}</div><div className="text-xs">Stories</div></div>
          <div><div className="text-xl font-serif text-amber-800">{book.stats.totalChapters}</div><div className="text-xs">Chapters</div></div>
          <div><div className="text-xl font-serif text-amber-800">{book.stats.totalDuration}</div><div className="text-xs">Duration</div></div>
        </div>
        <button onClick={() => setView('chapters')} className="bg-amber-800 hover:bg-amber-900 text-white px-8 py-3 rounded-full shadow-lg transition-all">
          Begin Listening
        </button>
        <p className="mt-10 text-xs text-stone-400">A Life Story Book by Linda</p>
      </div>
    </div>
    </>
  );

  if (view === 'chapters') return (
    <>
      {AudioPlayer}
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setView('cover')} className="text-amber-700 mb-4 flex items-center gap-1 text-sm"><ChevronLeft className="w-4 h-4"/>Back</button>
        <h1 className="font-serif text-2xl text-stone-800 text-center mb-6">{book.resident.preferredName}'s Story</h1>
        <div className="space-y-3">
          {book.chapters.map((c, i) => (
            <div key={c.id} onClick={() => { setChapter(c); setStory(c.stories[0]); setView('story'); setProgress(0); }}
              className="bg-white/80 rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer border border-amber-100 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-amber-600 text-xs font-medium">Chapter {i+1}</span>
                  <h2 className="font-serif text-lg text-stone-800">{c.title}</h2>
                  <p className="text-stone-500 text-sm">{c.description}</p>
                  <p className="text-stone-400 text-xs mt-2">{c.stories.length} stories</p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-300"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );

  if (view === 'story' && story && chapter) {
    const chIdx = book.chapters.findIndex(c => c.id === chapter.id);
    return (
      <>
        {AudioPlayer}
      <div className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50 p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setView('chapters')} className="text-amber-700 flex items-center gap-1 text-sm"><ChevronLeft className="w-4 h-4"/>Chapters</button>
            <span className="text-amber-600 text-xs">Ch. {chIdx+1}: {chapter.title}</span>
            <div className="w-16"/>
          </div>
          
          <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-amber-100 mb-4">
            <h1 className="font-serif text-xl text-stone-800 text-center mb-1">"{story.title}"</h1>
            <p className="text-stone-400 text-xs text-center mb-6">{story.recordedDate}</p>
            
            <div className="flex justify-center items-end gap-0.5 h-12 mb-4">
              {[...Array(35)].map((_, i) => (
                <div key={i} className={`w-1 rounded-full transition-all ${(i/35)*100 <= progress ? 'bg-amber-500' : 'bg-stone-200'}`}
                  style={{height: `${12 + Math.sin(i*0.4)*8 + Math.random()*12}px`}}/>
              ))}
            </div>
            
            <div className="mb-4">
              <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{width: `${progress}%`}}/>
              </div>
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>{formatTime((progress/100)*story.durationSeconds)}</span>
                <span>{story.duration}</span>
              </div>
            </div>
            
            <div className="flex justify-center items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 text-stone-400 hover:text-amber-700"><SkipBack className="w-5 h-5"/></button>
              <button onClick={() => setPlaying(!playing)} className="w-14 h-14 rounded-full bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center shadow-lg">
                {playing ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5 ml-0.5"/>}
              </button>
              <button onClick={() => navigate(1)} className="p-2 text-stone-400 hover:text-amber-700"><SkipForward className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="bg-white/60 rounded-xl p-4 border border-amber-100">
            <p className="text-xs text-amber-700 mb-2 font-medium">Transcript</p>
            <p className="font-serif text-stone-700 leading-relaxed">{story.transcript}</p>
          </div>
          
          <div className="mt-6 border-t border-amber-200 pt-4">
            <p className="text-xs text-stone-500 mb-2">Stories in this chapter</p>
            {chapter.stories.map((s, i) => (
              <button key={s.id} onClick={() => { setStory(s); setProgress(0); setPlaying(true); }}
                className={`w-full text-left p-2 rounded-lg mb-1 flex items-center gap-2 transition-all ${s.id === story.id ? 'bg-amber-100' : 'hover:bg-white/50'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${s.id === story.id ? 'bg-amber-600 text-white' : listened.has(s.id) ? 'bg-amber-200 text-amber-700' : 'bg-stone-200 text-stone-500'}`}>
                  {listened.has(s.id) ? '✓' : i+1}
                </span>
                <span className={`text-sm ${s.id === story.id ? 'text-amber-900 font-medium' : 'text-stone-700'}`}>{s.title}</span>
                <span className="text-xs text-stone-400 ml-auto">{s.duration}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      </>
    );
  }
  return null;
}
