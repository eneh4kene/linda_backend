import React, { useState } from 'react';

const LifeStoryBookMockups = () => {
    const [activeTab, setActiveTab] = useState('rich');

    // QR Code placeholder component
    const QRCode = ({ duration }) => (
        <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-stone-100 border-2 border-stone-300 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-12 h-12 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm2 2h1v1h-1v-1zm-2 2h1v1h-1v-1zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1zm0 2h1v1h-1v-1zm-4 0h1v1h-1v-1z" />
                </svg>
            </div>
            <span className="text-xs text-stone-500 font-medium tracking-wide uppercase">Listen</span>
            <span className="text-xs text-stone-400">{duration}</span>
        </div>
    );

    // Page component with book-like styling
    const BookPage = ({ children, pageNumber, side = 'right' }) => (
        <div className={`bg-stone-50 min-h-96 p-8 ${side === 'left' ? 'border-r border-stone-200' : ''} relative`}>
            {children}
            <div className={`absolute bottom-4 ${side === 'left' ? 'left-8' : 'right-8'} text-xs text-stone-400`}>
                {pageNumber}
            </div>
        </div>
    );

    // Tab button component
    const TabButton = ({ id, label, active, onClick }) => (
        <button
            onClick={() => onClick(id)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${active
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-stone-200 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-light text-stone-800 tracking-wide mb-2">Life Story Book</h1>
                    <p className="text-stone-500 text-sm">Page Layout Mockups</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-1 mb-8">
                    <TabButton id="rich" label="Rich Story" active={activeTab === 'rich'} onClick={setActiveTab} />
                    <TabButton id="short" label="Short Story" active={activeTab === 'short'} onClick={setActiveTab} />
                    <TabButton id="message" label="Message" active={activeTab === 'message'} onClick={setActiveTab} />
                </div>

                {/* Book Spread Container */}
                <div className="bg-white shadow-2xl rounded-sm overflow-hidden">

                    {/* Rich Story Layout - Dorothy's "Frank" */}
                    {activeTab === 'rich' && (
                        <>
                            <div className="bg-stone-800 text-white text-center py-3 text-xs tracking-widest uppercase">
                                Rich Story Layout — Dorothy Bancroft, "Frank"
                            </div>
                            <div className="grid grid-cols-2">
                                {/* Left Page */}
                                <BookPage pageNumber="14" side="left">
                                    <div className="h-full flex flex-col">
                                        <div className="text-xs text-stone-400 tracking-widest uppercase mb-6">
                                            Chapter Two
                                        </div>
                                        <h2 className="font-serif text-stone-800 text-lg mb-8">
                                            The Life I Built
                                        </h2>

                                        <div className="border-l-2 border-stone-300 pl-6 mb-8">
                                            <h3 className="font-serif text-2xl text-stone-800 mb-4 italic">
                                                Frank
                                            </h3>
                                        </div>

                                        <blockquote className="font-serif text-xl text-stone-700 leading-relaxed mb-8 italic">
                                            "Fifty-three years of someone's hand on your back, and then it's gone."
                                        </blockquote>

                                        <div className="mt-auto">
                                            <div className="text-xs text-stone-400 italic">
                                                Recorded 15th November 2024
                                            </div>
                                            <div className="text-xs text-stone-400">
                                                Dorothy was 81
                                            </div>
                                        </div>
                                    </div>
                                </BookPage>

                                {/* Right Page */}
                                <BookPage pageNumber="15" side="right">
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-end mb-6">
                                            <QRCode duration="4 min 30 sec" />
                                        </div>

                                        <div className="font-serif text-stone-700 text-sm leading-relaxed space-y-4 flex-grow">
                                            <p>
                                                It was his whole world, that garden. After he retired from the steelworks,
                                                he was out there every single day. Six in the morning, I'd wake up and the
                                                bed would be empty and I'd know where he was. On his knees in the dirt,
                                                talking to the tomatoes.
                                            </p>
                                            <p>
                                                He said they grew better if you spoke to them. I thought he'd gone soft
                                                in the head. But you know what? His tomatoes were the best on the street.
                                                Everyone said so.
                                            </p>
                                            <p>
                                                And the roses along the back wall. He put those in for me. Said if he was
                                                going to spend all his time out there, he wanted me to have something to
                                                look at from the kitchen window.
                                            </p>
                                            <p className="text-stone-400 italic text-xs">
                                                [Transcript continues on following page]
                                            </p>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-stone-200">
                                            <div className="text-xs text-stone-400 text-center">
                                                ✦ Add your own photo here ✦
                                            </div>
                                        </div>
                                    </div>
                                </BookPage>
                            </div>

                            {/* Second Spread for Rich Story */}
                            <div className="border-t-4 border-stone-300"></div>
                            <div className="grid grid-cols-2">
                                {/* Left Page - Continuation */}
                                <BookPage pageNumber="16" side="left">
                                    <div className="font-serif text-stone-700 text-sm leading-relaxed space-y-4">
                                        <p>
                                            I was working at Woolworths, on the pick and mix counter. And this lad
                                            comes in, couldn't have been more than twenty, and he's just standing
                                            there. Not buying anything. Just standing there looking at me.
                                        </p>
                                        <p>
                                            I said, "Can I help you?" And he went bright red. Absolutely scarlet.
                                            And he said, "I've forgotten what I came in for."
                                        </p>
                                        <p>
                                            He came back every day for a week. Bought more sweets than any man
                                            could eat. Finally on the Friday he said, "Would you like to go to
                                            the pictures?" Just like that. I said yes before he'd finished the
                                            sentence.
                                        </p>
                                        <p>
                                            He bought me an ice cream in the interval. Vanilla. And he held my
                                            hand during the second half. His hands were rough from the work, but
                                            warm.
                                        </p>
                                    </div>
                                </BookPage>

                                {/* Right Page - Conclusion */}
                                <BookPage pageNumber="17" side="right">
                                    <div className="flex flex-col h-full">
                                        <div className="font-serif text-stone-700 text-sm leading-relaxed space-y-4 flex-grow">
                                            <p>
                                                And when he walked me home, he didn't try anything. Just said,
                                                "Same time next week?" And I said yes. And that was it. Every
                                                Friday for fifty-three years.
                                            </p>
                                            <p>
                                                Pictures on Friday. Garden on Saturday. Church on Sunday. That
                                                was our life. Nothing fancy. Nothing special. Just... us.
                                            </p>
                                        </div>

                                        <blockquote className="font-serif text-lg text-stone-700 leading-relaxed my-8 italic border-l-2 border-stone-300 pl-6">
                                            "I looked at him holding that cap, and I thought, I'm going to
                                            marry this man."
                                        </blockquote>

                                        <div className="text-right">
                                            <div className="text-xs text-stone-400 italic">
                                                The roses in the garden came from their wedding.
                                            </div>
                                            <div className="text-xs text-stone-400 italic">
                                                Dorothy planted cuttings from her bouquet.
                                            </div>
                                            <div className="text-xs text-stone-400 italic mt-2">
                                                June 1962 — November 2024
                                            </div>
                                        </div>
                                    </div>
                                </BookPage>
                            </div>
                        </>
                    )}

                    {/* Short Story Layout - Bernie's Cricket Match */}
                    {activeTab === 'short' && (
                        <>
                            <div className="bg-stone-800 text-white text-center py-3 text-xs tracking-widest uppercase">
                                Short Story Layout — Bernie Walsh, "The Only Six"
                            </div>
                            <div className="grid grid-cols-2">
                                {/* Left Page */}
                                <BookPage pageNumber="22" side="left">
                                    <div className="h-full flex flex-col">
                                        <div className="text-xs text-stone-400 tracking-widest uppercase mb-6">
                                            Chapter Two
                                        </div>

                                        <div className="border-l-2 border-stone-300 pl-6 mb-8">
                                            <h3 className="font-serif text-2xl text-stone-800 mb-2 italic">
                                                The Only Six
                                            </h3>
                                            <div className="text-sm text-stone-500">
                                                Thornbury, 1972
                                            </div>
                                        </div>

                                        <blockquote className="font-serif text-xl text-stone-700 leading-relaxed mb-8 italic">
                                            "I kept the ball. The one I hit for six. I've still got it somewhere."
                                        </blockquote>

                                        <div className="flex-grow"></div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-xs text-stone-400 italic">
                                                    Recorded 22nd November 2024
                                                </div>
                                                <div className="text-xs text-stone-400">
                                                    Bernie was 86
                                                </div>
                                            </div>
                                            <QRCode duration="2 min 15 sec" />
                                        </div>
                                    </div>
                                </BookPage>

                                {/* Right Page */}
                                <BookPage pageNumber="23" side="right">
                                    <div className="flex flex-col h-full">
                                        <div className="font-serif text-stone-700 text-sm leading-relaxed space-y-4">
                                            <p>
                                                We were losing. Badly. They'd scored 180 and we were 95 for 8.
                                                Finished, basically. But our last two batsmen, they just dug in.
                                                Proper dug in.
                                            </p>
                                            <p>
                                                I was last man. Number eleven. Couldn't bat to save my life,
                                                everyone knew it. And I'm sat there in the pavilion with my pads
                                                on, watching. Sick with nerves. Physically sick.
                                            </p>
                                            <p>
                                                Wilson got out. LBW. And I had to walk out there with us needing
                                                12 to win. My legs were shaking so hard I could barely walk.
                                            </p>
                                            <p>
                                                I was thinking about my dad. He was in the crowd. He'd come to
                                                every game since I was fourteen, and I'd never done anything
                                                worth watching.
                                            </p>
                                        </div>

                                        <div className="my-8 border-t border-b border-stone-200 py-6">
                                            <p className="font-serif text-stone-700 text-sm leading-relaxed">
                                                Third ball I hit. Don't know how. Closed my eyes and swung.
                                                And it went. Right over the bowler's head. Over the boundary.
                                                Six runs.
                                            </p>
                                            <p className="font-serif text-stone-700 text-sm leading-relaxed mt-4">
                                                I could hear my dad shouting. Never heard him shout before.
                                                Quiet man, my dad. But I heard him that day.
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <div className="inline-block border border-stone-300 rounded px-4 py-2">
                                                <div className="text-xs text-stone-500 mb-1">Photo placeholder</div>
                                                <div className="text-xs text-stone-400 italic">
                                                    The cricket ball, if found
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </BookPage>
                            </div>
                        </>
                    )}

                    {/* Message Story Layout - Margaret to James */}
                    {activeTab === 'message' && (
                        <>
                            <div className="bg-stone-800 text-white text-center py-3 text-xs tracking-widest uppercase">
                                Message Layout — Margaret Thompson, "For James"
                            </div>
                            <div className="grid grid-cols-2">
                                {/* Left Page - Context */}
                                <BookPage pageNumber="46" side="left">
                                    <div className="h-full flex flex-col justify-center items-center text-center px-8">
                                        <div className="text-xs text-stone-400 tracking-widest uppercase mb-8">
                                            Chapter Five
                                        </div>
                                        <h2 className="font-serif text-stone-800 text-lg mb-4">
                                            What I Want You to Know
                                        </h2>

                                        <div className="w-16 border-t border-stone-300 my-8"></div>

                                        <h3 className="font-serif text-3xl text-stone-800 italic mb-4">
                                            For James
                                        </h3>

                                        <div className="text-sm text-stone-500 italic">
                                            From your grandmother
                                        </div>
                                        <div className="text-sm text-stone-500">
                                            December 2024
                                        </div>
                                    </div>
                                </BookPage>

                                {/* Right Page - The Message */}
                                <BookPage pageNumber="47" side="right">
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-end mb-6">
                                            <QRCode duration="0 min 50 sec" />
                                        </div>

                                        <div className="flex-grow flex flex-col justify-center">
                                            <blockquote className="font-serif text-lg text-stone-800 leading-relaxed italic text-center px-4">
                                                <p className="mb-6">
                                                    "James.
                                                </p>
                                                <p className="mb-6">
                                                    You're quieter than the others, but I see you.
                                                </p>
                                                <p className="mb-6">
                                                    I know you watch and you think and you feel things deeply.
                                                </p>
                                                <p className="mb-6">
                                                    That's a gift, love.
                                                </p>
                                                <p className="mb-6">
                                                    The world needs people who pay attention.
                                                </p>
                                                <p>
                                                    Don't let anyone make you feel you should be louder."
                                                </p>
                                            </blockquote>
                                        </div>

                                        <div className="text-center text-xs text-stone-400 italic mt-8">
                                            — Margaret Thompson, your grandmother
                                        </div>
                                    </div>
                                </BookPage>
                            </div>

                            {/* Wisdom Page */}
                            <div className="border-t-4 border-stone-300"></div>
                            <div className="grid grid-cols-2">
                                <BookPage pageNumber="52" side="left">
                                    <div className="h-full flex flex-col justify-center text-center px-8">
                                        <div className="text-xs text-stone-400 tracking-widest uppercase mb-8">
                                            Chapter Five
                                        </div>

                                        <h3 className="font-serif text-2xl text-stone-800 italic mb-4">
                                            What I've Learned
                                        </h3>

                                        <div className="text-sm text-stone-500">
                                            Margaret's advice for her grandchildren
                                        </div>

                                        <div className="mt-8">
                                            <QRCode duration="1 min 30 sec" />
                                        </div>
                                    </div>
                                </BookPage>

                                <BookPage pageNumber="53" side="right">
                                    <div className="flex flex-col h-full justify-center px-4">
                                        <div className="space-y-8 font-serif text-stone-700 italic">
                                            <p className="text-base leading-relaxed">
                                                "Be kind. Not nice — kind. There's a difference. Nice is easy.
                                                Kind is hard. Kind is doing the right thing when no one's watching."
                                            </p>

                                            <p className="text-base leading-relaxed">
                                                "Find someone who makes ordinary days feel like enough. The big
                                                moments come and go. But someone who makes a Tuesday feel like
                                                a gift — that's who you marry."
                                            </p>

                                            <p className="text-base leading-relaxed">
                                                "Call your mother. I know, I know. But do it anyway. She worries
                                                more than she says. We all do."
                                            </p>

                                            <p className="text-base leading-relaxed">
                                                "And forgive people. Forgive them before you're ready. Before
                                                they've apologized. Because holding onto anger is like carrying
                                                stones. It only hurts you."
                                            </p>
                                        </div>
                                    </div>
                                </BookPage>
                            </div>

                            {/* Final Benediction */}
                            <div className="border-t-4 border-stone-300"></div>
                            <div className="grid grid-cols-1">
                                <div className="bg-stone-50 p-12 text-center">
                                    <div className="max-w-lg mx-auto">
                                        <blockquote className="font-serif text-xl text-stone-800 leading-relaxed italic mb-8">
                                            "When I'm gone — and I will be, love, that's how it works — don't be
                                            too sad. I had a beautiful life. I loved and was loved. I saw my
                                            children grow up and have children of their own. I got to meet you
                                            three. That's more than enough. That's everything."
                                        </blockquote>

                                        <div className="w-16 border-t border-stone-400 mx-auto my-8"></div>

                                        <div className="text-sm text-stone-500 italic">
                                            Margaret Thompson
                                        </div>
                                        <div className="text-sm text-stone-500">
                                            1937 —
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Design Notes */}
                <div className="mt-8 bg-white rounded p-6 shadow">
                    <h4 className="text-sm font-medium text-stone-800 mb-4 tracking-wide uppercase">
                        Design Notes
                    </h4>
                    {activeTab === 'rich' && (
                        <ul className="text-sm text-stone-600 space-y-2">
                            <li>• <strong>4 pages</strong> for a story this rich — room to breathe</li>
                            <li>• Pull quote on left page catches the eye first, draws reader in</li>
                            <li>• QR code prominent on right page — clear call to action</li>
                            <li>• Transcript is edited, not verbatim — the gold, not the preamble</li>
                            <li>• Photo placeholder at the bottom — families add their own</li>
                            <li>• Second pull quote near the end rewards those who read fully</li>
                        </ul>
                    )}
                    {activeTab === 'short' && (
                        <ul className="text-sm text-stone-600 space-y-2">
                            <li>• <strong>2 pages</strong> only — short stories don't get padded</li>
                            <li>• Pull quote and QR on same page — single spread completeness</li>
                            <li>• The climax (the six, the dad shouting) is visually separated</li>
                            <li>• Photo placeholder specifically suggests the cricket ball</li>
                            <li>• Context line ("Thornbury, 1972") grounds it in time and place</li>
                        </ul>
                    )}
                    {activeTab === 'message' && (
                        <ul className="text-sm text-stone-600 space-y-2">
                            <li>• <strong>6 pages</strong> for the full Chapter 5 sequence</li>
                            <li>• Each grandchild gets their own spread — personal, not shared</li>
                            <li>• Message is centered, spaced generously — feels like a letter</li>
                            <li>• Wisdom section stands alone — quotable, shareable</li>
                            <li>• Final benediction is full-width — the book's emotional climax</li>
                            <li>• No photo placeholder — the words are enough</li>
                        </ul>
                    )}
                </div>

                {/* Typography Notes */}
                <div className="mt-4 bg-stone-100 rounded p-6">
                    <h4 className="text-sm font-medium text-stone-800 mb-4 tracking-wide uppercase">
                        Typography & Feel
                    </h4>
                    <div className="text-sm text-stone-600 space-y-2">
                        <p><strong>Fonts:</strong> Serif for body and quotes (warmth, timelessness). Sans-serif for labels and navigation (clarity, modernity).</p>
                        <p><strong>Colour:</strong> Stone/warm grey palette. No pure black. Feels soft, archival, gentle.</p>
                        <p><strong>Spacing:</strong> Generous. White space is emotional space. Let each story breathe.</p>
                        <p><strong>QR codes:</strong> Simple, elegant. "Listen" is the verb. Duration sets expectations.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LifeStoryBookMockups;