import { useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const SHARED_SVG = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" fill="#0891B2" />
  </svg>
)

export default function LandingPage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef(false)

  const runScan = useCallback(() => {
    const line = document.getElementById('lp-scanLine')
    const plate = document.getElementById('lp-plateResult')
    const status = document.getElementById('lp-scanStatus')
    const statusTxt = document.getElementById('lp-scanStatusTxt')
    const trip = document.getElementById('lp-tripCard')
    if (!line || !plate || !status || !statusTxt || !trip) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      plate.style.opacity = '1'
      plate.style.transform = 'none'
      status.classList.add('lp-ok')
      statusTxt.textContent = 'Plate detected — LND 582 FK'
      trip.style.opacity = '1'
      trip.style.transform = 'none'
      return
    }

    line.style.transition = 'none'
    line.style.opacity = '0'
    line.style.top = '50%'
    plate.style.transition = 'none'
    plate.style.opacity = '0'
    plate.style.transform = 'scale(.92)'
    status.classList.remove('lp-ok')
    statusTxt.textContent = 'Positioning plate\u2026'
    trip.style.transition = 'none'
    trip.style.opacity = '0'
    trip.style.transform = 'translateY(10px)'

    setTimeout(() => {
      line.style.transition = 'top 1.1s ease-in-out, opacity .3s ease'
      line.style.opacity = '1'
      line.style.top = '8%'
      requestAnimationFrame(() => { line.style.top = '92%' })
    }, 300)

    setTimeout(() => { statusTxt.textContent = 'Reading plate\u2026' }, 900)

    setTimeout(() => {
      line.style.opacity = '0'
      plate.style.transition = 'opacity .35s ease, transform .35s cubic-bezier(.2,.8,.2,1.1)'
      plate.style.opacity = '1'
      plate.style.transform = 'scale(1)'
      status.classList.add('lp-ok')
      statusTxt.textContent = 'Plate detected \u2014 LND 582 FK'
    }, 1700)

    setTimeout(() => {
      trip.style.transition = 'opacity .4s ease, transform .4s ease'
      trip.style.opacity = '1'
      trip.style.transform = 'translateY(0)'
    }, 2200)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll reveal
    const rvEls = document.querySelectorAll('.landing .lp-rv')
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window && !reduced) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('lp-in')
              io!.unobserve(e.target)
            }
          })
        },
        { threshold: 0.15 }
      )
      rvEls.forEach((el) => io!.observe(el))
    } else {
      rvEls.forEach((el) => el.classList.add('lp-in'))
    }

    // Scan stage trigger
    let scanIo: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      scanIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !playedRef.current) {
              playedRef.current = true
              runScan()
            }
          })
        },
        { threshold: 0.4 }
      )
      if (stageRef.current) scanIo.observe(stageRef.current)
    } else {
      runScan()
    }

    // Loop scan every 7s while in view
    let intervalId: ReturnType<typeof setInterval> | undefined
    if (!reduced) {
      intervalId = setInterval(() => {
        const stage = stageRef.current
        if (!stage) return
        const r = stage.getBoundingClientRect()
        const inView = r.top < window.innerHeight && r.bottom > 0
        if (inView) runScan()
      }, 7000)
    }

    return () => {
      io?.disconnect()
      scanIo?.disconnect()
      if (intervalId !== undefined) clearInterval(intervalId)
    }
  }, [runScan])

  return (
    <div className="landing">
      <header>
        <nav>
          <Link to="/" className="lp-logo">
            <span className="lp-logo-mark">{SHARED_SVG}</span>
            SafeCommute
          </Link>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <a href="#nigeria">Built for Nigeria</a>
            <a href="#privacy">Privacy</a>
            <a href="#pricing">Pricing</a>
          </div>
          <Link to="/signup" className="lp-nav-cta">Try SafeCommute</Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-eyebrow-row">
              <span className="lp-plate-chip">
                <span className="lp-strip" />
                <span className="lp-plate-txt">PH &middot; SAFE</span>
              </span>
              <span className="lp-eyebrow-label">BUILT FOR PORT HARCOURT ROADS</span>
            </div>
            <h1 className="lp-hero-h">
              You don&apos;t know the driver.{' '}
              <span className="lp-hl">We make sure someone else does.</span>
            </h1>
            <p className="lp-hero-sub">
              Scan the plate before you get in. Share your live trip with someone you trust.
              One tap sends help, with your last location, if something&apos;s wrong.
            </p>
            <div className="lp-hero-ctas">
              <Link to="/signup" className="lp-btn-primary">Start a safer trip &rarr;</Link>
              <a href="#how" className="lp-btn-ghost">See how it works</a>
            </div>
            <p className="lp-hero-note">
              Works with danfo, keke, and cabs &mdash; <b>not just app-hailed rides.</b>
            </p>
          </div>

          <div className="lp-scan-stage lp-rv" ref={stageRef}>
            <div className="lp-scan-frame">
              <div className="lp-bracket lp-bracket-tl" />
              <div className="lp-bracket lp-bracket-tr" />
              <div className="lp-bracket lp-bracket-bl" />
              <div className="lp-bracket lp-bracket-br" />
              <div className="lp-scan-guide">
                <div className="lp-scan-line" id="lp-scanLine" />
                <div className="lp-plate-result" id="lp-plateResult">
                  <span className="lp-plate-result-strip" />
                  <span className="lp-plate-result-txt">LND 582 FK</span>
                </div>
              </div>
            </div>
            <div className="lp-scan-status" id="lp-scanStatus">
              <span className="lp-dot" />
              <span id="lp-scanStatusTxt">Positioning plate&hellip;</span>
            </div>
            <div className="lp-trip-card" id="lp-tripCard">
              <div className="lp-who">
                Sharing with Hannah
                <span>Live trip &middot; Heliconia Park &middot; 12 mins</span>
              </div>
              <div className="lp-pulse-dot" />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-problem">
        <div className="lp-wrap lp-problem-grid">
          <div>
            <span className="lp-eyebrow-label">THE REAL RIDE</span>
            <h2>You get in. You hope for the best. That&apos;s the whole safety plan, most days.</h2>
            <p>
              Danfo, keke, cab &mdash; you climb in, and that&apos;s it. If something goes wrong,
              nobody knows which vehicle you were in, who was driving, or where you were headed.
              SafeCommute closes that gap, in the ten seconds before you shut the door.
            </p>
          </div>
          <div className="lp-stat-plate">
            <div className="lp-stat-row">
              <span className="lp-num lp-mono">01</span>
              <span className="lp-lbl">Scan the plate &mdash; it&apos;s logged before the trip starts.</span>
            </div>
            <div className="lp-stat-row">
              <span className="lp-num lp-mono">02</span>
              <span className="lp-lbl">One person always knows your live route.</span>
            </div>
            <div className="lp-stat-row">
              <span className="lp-num lp-mono">03</span>
              <span className="lp-lbl">Help is one tap away, with your exact location.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-how" id="how">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <span className="lp-eyebrow-label lp-mono">HOW IT WORKS</span>
            <h2>Four steps. Ten seconds. Every ride.</h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step lp-rv">
              <div className="lp-idx">01</div>
              <h3>Scan the plate</h3>
              <p>Point your camera at the plate. It reads and confirms in seconds &mdash; no typing, no guessing.</p>
            </div>
            <div className="lp-step lp-rv">
              <div className="lp-idx">02</div>
              <h3>Pick who to tell</h3>
              <p>Choose a trusted contact. They&apos;ll get your live trip the moment you start moving.</p>
            </div>
            <div className="lp-step lp-rv">
              <div className="lp-idx">03</div>
              <h3>Ride, tracked</h3>
              <p>Your contact sees your route and ETA until you arrive &mdash; nothing more, nothing stored.</p>
            </div>
            <div className="lp-step lp-rv">
              <div className="lp-idx">04</div>
              <h3>One tap for help</h3>
              <p>If something feels wrong, one tap sends an alert with your last known location.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-made" id="nigeria">
        <div className="lp-wrap lp-made-grid">
          <div>
            <span className="lp-eyebrow-label lp-mono">MADE FOR THESE ROADS</span>
            <div className="lp-made-list" style={{ marginTop: 20 }}>
              <div className="lp-made-item">
                <span className="lp-mk">01 /</span>
                <div>
                  <h4>Danfo, keke, and cabs</h4>
                  <p>Not just app-hailed rides &mdash; SafeCommute works with whatever you flag down.</p>
                </div>
              </div>
              <div className="lp-made-item">
                <span className="lp-mk">02 /</span>
                <div>
                  <h4>Runs on SMS, not just data</h4>
                  <p>Your contact gets updates even when your connection doesn&apos;t hold.</p>
                </div>
              </div>
              <div className="lp-made-item">
                <span className="lp-mk">03 /</span>
                <div>
                  <h4>Naira pricing</h4>
                  <p>No card required to start. Upgrade later, if you want to.</p>
                </div>
              </div>
              <div className="lp-made-item">
                <span className="lp-mk">04 /</span>
                <div>
                  <h4>Port Harcourt roads</h4>
                  <p>Mapped for how people actually move through this city.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-made-visual">
            <div className="lp-route-line">
              <svg className="lp-route-svg" viewBox="0 0 380 180" fill="none">
                <path
                  d="M30 150 C 90 150, 110 60, 170 60 S 260 30, 350 30"
                  stroke="#0891B2"
                  strokeWidth="2.5"
                  strokeDasharray="1 8"
                  strokeLinecap="round"
                />
                <circle cx="30" cy="150" r="6" fill="#059669" />
                <circle cx="350" cy="30" r="6" fill="#fff" stroke="#0891B2" strokeWidth="2" />
              </svg>
            </div>
            <div className="lp-cap">HELICONIA PARK &rarr; PORT HARCOURT PLEASURE PARK &middot; 25 MINS</div>
          </div>
        </div>
      </section>

      <section className="lp-privacy" id="privacy">
        <div className="lp-wrap">
          <div className="lp-privacy-card lp-rv">
            <h2>Your location isn&apos;t a product. It&apos;s yours until you press share.</h2>
            <div className="lp-privacy-list">
              <div className="lp-privacy-row">
                <span className="lp-ic">🔒</span>
                <p><b>Never stored when you&apos;re idle.</b> Location is only shared live, during an active trip.</p>
              </div>
              <div className="lp-privacy-row">
                <span className="lp-ic">🗑️</span>
                <p><b>Deleted on arrival.</b> The moment your trip ends, the trail is gone.</p>
              </div>
              <div className="lp-privacy-row">
                <span className="lp-ic">👁️</span>
                <p><b>Seen by one person.</b> Only the contact you chose, for that one trip.</p>
              </div>
              <div className="lp-privacy-row">
                <span className="lp-ic">🔑</span>
                <p><b>You can revoke access</b> from your device or the privacy dashboard, anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-pricing" id="pricing">
        <div className="lp-wrap">
          <div className="lp-section-head" style={{ margin: '0 auto 50px', textAlign: 'center', maxWidth: 520 }}>
            <span className="lp-eyebrow-label lp-mono">PRICING</span>
            <h2>Start free. Upgrade if you ride a lot.</h2>
          </div>
          <div className="lp-price-grid">
            <div className="lp-price-card lp-rv">
              <h3>Free</h3>
              <div className="lp-price-amt">₦0</div>
              <ul className="lp-price-list">
                <li>1 trusted contact per trip</li>
                <li>Live trip sharing</li>
                <li>Emergency alerts</li>
                <li>30-day trip history</li>
              </ul>
              <Link to="/signup" className="lp-price-cta">Start free</Link>
            </div>
            <div className="lp-price-card lp-pro lp-rv">
              <span className="lp-price-badge">MOST RIDERS</span>
              <h3>Premium</h3>
              <div className="lp-price-amt">₦10,000<span>/yr</span></div>
              <ul className="lp-price-list">
                <li>Up to 5 trusted contacts</li>
                <li>Unlimited trip history</li>
                <li>Priority alert delivery</li>
                <li>Ad-free, always</li>
              </ul>
              <Link to="/signup" className="lp-price-cta">Go premium</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-closing">
        <div className="lp-wrap">
          <h2>Next time you&apos;re not sure who&apos;s driving.</h2>
          <p>Have it ready before you need it.</p>
          <div className="lp-hero-ctas">
            <Link to="/signup" className="lp-btn-primary">Try SafeCommute &rarr;</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="lp-wrap">
          <div className="lp-foot-top">
            <Link to="/" className="lp-logo" style={{ color: '#fff' }}>
              <span className="lp-logo-mark">{SHARED_SVG}</span>
              SafeCommute
            </Link>
            <div className="lp-foot-links">
              <a href="#how">How it works</a>
              <a href="#privacy">Privacy</a>
              <a href="#pricing">Pricing</a>
              <a href="mailto:support@safecommute.app">Support</a>
            </div>
          </div>
          <div className="lp-foot-bottom">
            <span>&copy; 2026 SafeCommute &middot; Port Harcourt, Nigeria</span>
            <span className="lp-mono">LOCATION SHARED LIVE, NEVER STORED</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
