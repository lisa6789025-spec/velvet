export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow fade-up">for the conversation you&rsquo;re already in</div>
        <h1 className="fade-up" style={{ animationDelay: "0.05s" }}>
          Stuck on <em>what to say back?</em>
        </h1>
        <p className="lede fade-up" style={{ animationDelay: "0.1s" }}>
          Paste the messages. Get one good line — in your own voice, ready to
          send. No persona, no script — just help finding the words.
        </p>
        <div className="cta-row fade-up" style={{ animationDelay: "0.15s" }}>
          <a className="btn" href="/dashboard?mode=signup">Try it — it&rsquo;s free</a>
          <a className="btn ghost" href="#how">See how it works</a>
        </div>

        <div className="hero-visual fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="chat-card">
            <div className="chat-head">
              <span className="chat-dot" />
              <span>the conversation so far</span>
            </div>
            <div className="bubble them">That hike looked unreal — I&rsquo;d have loved that view.</div>
            <div className="bubble you">It was everything. Best one of the year, easily.</div>
          </div>
          <div className="note suggestion">
            <div className="stamp">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                <path d="M4 6l8 6 8-6M4 6h16v12H4V6z" />
              </svg>
            </div>
            &ldquo;Sunrise beats sunset up there — and it&rsquo;s only forty minutes. Next time, you&rsquo;re coming.&rdquo;
          </div>
          <div className="meta-row">
            <span>— a suggestion, not a script</span>
            <span>edit freely before sending</span>
          </div>
        </div>
      </section>

      <section className="stats fade-up" style={{ animationDelay: "0.4s" }}>
        <div className="stat">
          <div className="stat-num">the promise</div>
          <h3 className="stat-title">one good line, not a script</h3>
        </div>
        <div className="stat">
          <div className="stat-num">the voice</div>
          <h3 className="stat-title">reads like you on a good day</h3>
        </div>
        <div className="stat">
          <div className="stat-num">the pace</div>
          <h3 className="stat-title">regenerate until it clicks</h3>
        </div>
        <div className="stat">
          <div className="stat-num">the start</div>
          <h3 className="stat-title">free forever — 20 a day</h3>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-head fade-up">
          <div className="eyebrow">how it works</div>
          <h2>Three steps from <em>stuck</em> to <em>sent</em></h2>
        </div>
        <div className="steps">
          <div className="step fade-up">
            <div className="step-num">01 / paste</div>
            <h3>Drop in the conversation</h3>
            <p>
              Your last message, their reply, the whole thread — whatever you&rsquo;re
              staring at. The more context, the sharper the line.
            </p>
          </div>
          <div className="step fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="step-num">02 / read</div>
            <h3>Get one clean suggestion</h3>
            <p>
              A single starting line in your own cadence. Not a script to follow —
              a first draft that already sounds like you.
            </p>
          </div>
          <div className="step fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="step-num">03 / send</div>
            <h3>Make it yours, then go</h3>
            <p>
              Tweak a word or two, copy it, and get back to the actual
              conversation instead of staring at the text box.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head fade-up">
          <div className="eyebrow">why it works</div>
          <h2>A second opinion, <em>not</em> a second voice</h2>
          <p className="lede">
            The point isn&rsquo;t to sound clever. It&rsquo;s to sound like yourself — without
            the three hours of overthinking.
          </p>
        </div>
        <div className="features">
          <div className="feature fade-up">
            <div className="stamp small">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                <path d="M12 3v18M5 8l-2 4h18l-2-4M5 16l-2-4M19 16l2-4" />
              </svg>
            </div>
            <h3>Your voice, preserved</h3>
            <p>
              Built from the lines you&rsquo;ve already written, so the suggestion
              reads like you on a good day — not like a smooth stranger.
            </p>
          </div>
          <div className="feature fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="stamp small">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l3 3 5-6" />
              </svg>
            </div>
            <h3>No persona, no charade</h3>
            <p>
              No fake flirt, no canned rizz. Just the words you&rsquo;d say if you
              weren&rsquo;t overthinking the reply.
            </p>
          </div>
          <div className="feature fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="stamp small">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                <path d="M4 4v6h6M20 20v-6h-6" />
              </svg>
            </div>
            <h3>Regenerate until it clicks</h3>
            <p>
              First line not quite right? Try again, free of charge. The best
              version of a good idea is a better one.
            </p>
          </div>
          <div className="feature fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="stamp small">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                <path d="M6 9h12M6 15h12M6 12h12" />
              </svg>
            </div>
            <h3>Fair limits, no subscription</h3>
            <p>
              20 replies free every day. One-time upgrades when you want more
              room — no monthly meter running in the background.
            </p>
          </div>
        </div>
      </section>

      <section className="section quote-band">
        <div className="note fade-up">
          <div className="stamp">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
              <path d="M4 6l8 6 8-6M4 6h16v12H4V6z" />
            </svg>
          </div>
          &ldquo;I&rsquo;d stared at her message for two hours. This gave me a first line
          that felt like me — and two weeks later we&rsquo;ve got plans Friday.&rdquo;
        </div>
        <div className="quote-attrib">— a user who stopped overthinking</div>
      </section>

      <section className="section" id="pricing">
        <div className="section-head fade-up">
          <div className="eyebrow">pricing</div>
          <h2>More room to <em>write</em></h2>
          <p className="lede">
            One-time, no subscription. Pick a pace and keep your streak going.
          </p>
        </div>
        <div className="pricing">
          <div className="price-card fade-up">
            <div className="price-name">free</div>
            <div className="price-amount">$0</div>
            <div className="price-blurb">20 replies a day, forever.</div>
            <a className="btn ghost price-cta" href="/dashboard?mode=signup">Start free</a>
          </div>
          <div className="price-card fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="price-name">basic</div>
            <div className="price-amount">$10</div>
            <div className="price-blurb">50 replies a day.</div>
            <a className="btn ghost price-cta" href="/dashboard?mode=signup">Pick Basic</a>
          </div>
          <div className="price-card featured fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="price-name">pro</div>
            <div className="price-amount">$25</div>
            <div className="price-blurb">250 replies a day.</div>
            <a className="btn price-cta" href="/dashboard?mode=signup">Pick Pro</a>
          </div>
          <div className="price-card fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="price-name">unlimited</div>
            <div className="price-amount">$50</div>
            <div className="price-blurb">As many as you need.</div>
            <a className="btn ghost price-cta" href="/dashboard?mode=signup">Go unlimited</a>
          </div>
        </div>
      </section>

      <section className="cta-band fade-up">
        <h2>The next line is closer than you think.</h2>
        <p>
          Paste the conversation. Get one good line back — in your own voice,
          ready to send.
        </p>
        <a className="btn" href="/dashboard?mode=signup">Try it — it&rsquo;s free</a>
      </section>
    </main>
  );
}
