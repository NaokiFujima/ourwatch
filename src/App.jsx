import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥']
const fmtSize = (b) => (b ? (b / 1024 / 1024 / 1024 >= 1 ? (b / 1024 ** 3).toFixed(2) + ' GB' : (b / 1024 ** 2).toFixed(0) + ' MB') : '-')
const fmtDur = (s) => (s ? `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m` : '-')

function useHash() {
  const [h, setH] = useState(location.hash || '#/')
  useEffect(() => {
    const f = () => setH(location.hash || '#/')
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}
const go = (p) => (location.hash = p)

export default function App() {
  const [session, setSession] = useState(undefined)
  const hash = useHash()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (session === undefined) return <p className="p-6">Memuat…</p>
  if (!session) return <Login />
  const user = session.user
  const room = hash.match(/^#\/room\/(.+)$/)
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-black/80 px-4 py-3 backdrop-blur">
        <a href="#/" className="text-2xl font-extrabold tracking-wide text-brand">OURWATCH</a>
        <nav className="flex items-center gap-3 text-sm">
          <a href="#/" className="hover:underline">Home</a>
          <a href="#/library" className="hover:underline">Library</a>
          <a href="#/settings" className="hover:underline">Profil</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {room ? <Watch id={room[1]} user={user} /> : hash === '#/library' ? <Library user={user} /> : hash === '#/new' ? <CreateRoom user={user} /> : hash === '#/settings' ? <Settings user={user} /> : <Home user={user} />}
      </main>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Login gagal: email atau password salah.')
    setBusy(false)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-black/60 p-6">
        <h1 className="text-3xl font-extrabold text-brand">OURWATCH</h1>
        <input className="inp" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="inp" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form>
    </div>
  )
}

function Home({ user }) {
  const [rooms, setRooms] = useState([])
  const [movies, setMovies] = useState([])
  const load = async () => {
    const r = await supabase.from('rooms').select('*, movies(title)').is('deleted_at', null).order('created_at', { ascending: false })
    setRooms(r.data || [])
    const m = await supabase.from('movies').select('*').order('created_at', { ascending: false }).limit(10)
    setMovies(m.data || [])
  }
  useEffect(() => { load() }, [])
  const del = async (id) => {
    if (!confirm('Hapus room ini? Film tetap ada di library.')) return
    await supabase.from('rooms').delete().eq('id', id)
    load()
  }
  const feat = movies[0]
  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-gradient-to-r from-brand/60 to-black p-6">
        <p className="text-sm uppercase text-white/70">Pilihan untuk malam ini</p>
        <h2 className="text-2xl font-bold">{feat ? feat.title : 'Belum ada film'}</h2>
        <a href="#/new" className="btn mt-4 inline-block">+ Buat Room</a>
      </section>
      <section>
        <h3 className="mb-2 text-lg font-bold">Room aktif</h3>
        {rooms.length === 0 && <p className="text-white/60">Belum ada room.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded bg-white/5 p-3">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-white/60">{r.movies?.title || 'Film dihapus'}</p>
              </div>
              <div className="flex gap-2">
                <a href={`#/room/${r.id}`} className="btn">Gabung</a>
                <button className="btn2" onClick={() => del(r.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-lg font-bold">Film terbaru</h3>
        <MovieGrid movies={movies} />
      </section>
    </div>
  )
}

function MovieGrid({ movies, onDelete }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {movies.map((m) => (
        <div key={m.id} className="rounded bg-white/5 p-3">
          <div className="mb-2 flex aspect-[2/3] items-center justify-center rounded bg-gradient-to-br from-zinc-700 to-zinc-900 text-4xl">🎬</div>
          <p className="truncate font-semibold">{m.title}</p>
          <p className="text-xs text-white/60">{fmtDur(m.duration_seconds)} · {fmtSize(m.file_size_bytes)}</p>
          <p className="text-xs text-white/40">{new Date(m.created_at).toLocaleDateString('id-ID')}</p>
          {onDelete && <button className="btn2 mt-2 w-full text-sm" onClick={() => onDelete(m)}>Hapus</button>}
        </div>
      ))}
    </div>
  )
}

function Library({ user }) {
  const [movies, setMovies] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => setMovies((await supabase.from('movies').select('*').order('created_at', { ascending: false })).data || [])
  useEffect(() => { load() }, [])
  const upload = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setBusy(true); setMsg('Mengunggah… jangan tutup halaman ini.')
    const path = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`
    const dur = await new Promise((res) => {
      const v = document.createElement('video'); v.preload = 'metadata'
      v.onloadedmetadata = () => { res(Math.round(v.duration)); URL.revokeObjectURL(v.src) }
      v.onerror = () => res(null); v.src = URL.createObjectURL(f)
    })
    const up = await supabase.storage.from('movies').upload(path, f, { contentType: f.type || 'video/mp4' })
    if (up.error) { setMsg('Upload gagal: ' + up.error.message); setBusy(false); return }
    const ins = await supabase.from('movies').insert({ title: f.name.replace(/\.[^.]+$/, ''), storage_path: path, duration_seconds: dur, file_size_bytes: f.size, uploaded_by: user.id })
    setMsg(ins.error ? 'Gagal menyimpan data: ' + ins.error.message : 'Upload berhasil ✅')
    setBusy(false); load()
  }
  const del = async (m) => {
    if (!confirm(`Hapus "${m.title}" secara permanen?`)) return
    await supabase.storage.from('movies').remove([m.storage_path])
    await supabase.from('movies').delete().eq('id', m.id)
    load()
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">My Library</h2>
        <label className={`btn cursor-pointer ${busy ? 'opacity-50' : ''}`}>
          + Upload film (MP4 H.264/AAC)
          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={upload} disabled={busy} />
        </label>
      </div>
      {msg && <p className="text-sm text-white/80">{msg}</p>}
      <MovieGrid movies={movies} onDelete={del} />
    </div>
  )
}

function CreateRoom({ user }) {
  const [name, setName] = useState('')
  const [movies, setMovies] = useState([])
  const [movieId, setMovieId] = useState('')
  useEffect(() => { supabase.from('movies').select('id,title').then(({ data }) => { setMovies(data || []); if (data?.[0]) setMovieId(data[0].id) }) }, [])
  const create = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('rooms').insert({ name, movie_id: movieId, created_by: user.id }).select().single()
    if (error) return alert(error.message)
    await supabase.from('playback_state').insert({ room_id: data.id })
    go(`#/room/${data.id}`)
  }
  return (
    <form onSubmit={create} className="mx-auto max-w-md space-y-4">
      <h2 className="text-xl font-bold">Buat Room</h2>
      <input className="inp" placeholder="Nama room" value={name} onChange={(e) => setName(e.target.value)} required />
      <select className="inp" value={movieId} onChange={(e) => setMovieId(e.target.value)} required>
        {movies.map((m) => <option key={m.id} value={m.id} className="text-black">{m.title}</option>)}
      </select>
      {movies.length === 0 && <p className="text-sm text-white/60">Upload film dulu di <a className="underline" href="#/library">Library</a>.</p>}
      <button className="btn w-full" disabled={!movieId}>Buat room</button>
    </form>
  )
}

function Watch({ id, user }) {
  const vid = useRef(null)
  const box = useRef(null)
  const ch = useRef(null)
  const mute = useRef(false) // cegah loop event
  const [room, setRoom] = useState(null)
  const [src, setSrc] = useState('')
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [peers, setPeers] = useState([])
  const [floats, setFloats] = useState([])
  const [rate, setRate] = useState(1)

  const apply = (s) => {
    const v = vid.current
    if (!v) return
    mute.current = true
    if (Math.abs(v.currentTime - s.time) > 1) v.currentTime = s.time
    if (s.rate && v.playbackRate !== s.rate) { v.playbackRate = s.rate; setRate(s.rate) }
    if (s.playing && v.paused) v.play().catch(() => {})
    if (!s.playing && !v.paused) v.pause()
    setTimeout(() => (mute.current = false), 400)
  }
  const send = (playing) => {
    if (mute.current || !vid.current) return
    const v = vid.current
    const s = { time: v.currentTime, playing, rate: v.playbackRate }
    ch.current?.send({ type: 'broadcast', event: 'sync', payload: s })
    supabase.from('playback_state').upsert({ room_id: id, current_time_seconds: s.time, is_playing: playing, playback_rate: s.rate, updated_by: user.id, updated_at: new Date().toISOString() })
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const r = await supabase.from('rooms').select('*, movies(storage_path,title)').eq('id', id).single()
      if (!alive || !r.data) return
      setRoom(r.data)
      const s = await supabase.storage.from('movies').createSignedUrl(r.data.movies.storage_path, 6 * 3600)
      setSrc(s.data?.signedUrl || '')
      await supabase.from('room_members').upsert({ room_id: id, user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'room_id,user_id' })
      const m = await supabase.from('messages').select('*').eq('room_id', id).order('created_at')
      setMsgs(m.data || [])
      const st = await supabase.from('playback_state').select('*').eq('room_id', id).maybeSingle()
      if (st.data) setTimeout(() => apply({ time: st.data.current_time_seconds, playing: false, rate: st.data.playback_rate }), 800)
    })()
    const c = supabase.channel(`room:${id}`, { config: { presence: { key: user.id } } })
    c.on('broadcast', { event: 'sync' }, ({ payload }) => apply(payload))
      .on('broadcast', { event: 'react' }, ({ payload }) => float(payload.emoji))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, ({ new: n }) => setMsgs((p) => (p.some((x) => x.id === n.id) ? p : [...p, n])))
      .on('presence', { event: 'sync' }, () => setPeers(Object.keys(c.presenceState())))
      .subscribe(async (st) => { if (st === 'SUBSCRIBED') await c.track({ at: Date.now() }) })
    ch.current = c
    return () => { alive = false; supabase.removeChannel(c) }
  }, [id])

  const float = (emoji) => {
    const k = Math.random()
    setFloats((p) => [...p, { k, emoji, x: 10 + Math.random() * 80 }])
    setTimeout(() => setFloats((p) => p.filter((f) => f.k !== k)), 2500)
  }
  const react = (emoji) => { float(emoji); ch.current?.send({ type: 'broadcast', event: 'react', payload: { emoji } }) }
  const chat = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const t = text; setText('')
    await supabase.from('messages').insert({ room_id: id, user_id: user.id, message_text: t })
  }
  const setSpeed = (r) => { setRate(r); vid.current.playbackRate = r; send(!vid.current.paused) }

  if (!room) return <p>Memuat room…</p>
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{room.name}</h2>
            <p className="text-sm text-white/60">{room.movies?.title} · {peers.length}/2 online</p>
          </div>
          <a href="#/" className="btn2">Keluar</a>
        </div>
        <div ref={box} className="relative overflow-hidden rounded bg-black">
          <video ref={vid} src={src} controls playsInline className="aspect-video w-full"
            onPlay={() => send(true)} onPause={() => send(false)} onSeeked={() => send(!vid.current.paused)} />
          {floats.map((f) => (
            <span key={f.k} className="pointer-events-none absolute bottom-12 animate-bounce text-3xl" style={{ left: f.x + '%' }}>{f.emoji}</span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {EMOJIS.map((e) => <button key={e} className="btn2 text-xl" onClick={() => react(e)}>{e}</button>)}
          <select className="btn2" value={rate} onChange={(e) => setSpeed(Number(e.target.value))}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r} className="text-black">{r}x</option>)}
          </select>
          <button className="btn2" onClick={() => box.current.requestFullscreen?.()}>⛶ Layar penuh</button>
        </div>
      </div>
      <aside className="flex h-96 flex-col rounded bg-white/5 lg:h-[32rem]">
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {msgs.map((m) => (
            <p key={m.id} className={`max-w-[85%] rounded px-3 py-1 text-sm ${m.user_id === user.id ? 'ml-auto bg-brand/70' : 'bg-white/10'}`}>{m.message_text}</p>
          ))}
        </div>
        <form onSubmit={chat} className="flex gap-2 p-2">
          <input className="inp" placeholder="Tulis pesan…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn">Kirim</button>
        </form>
      </aside>
    </div>
  )
}

function Settings({ user }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h2 className="text-xl font-bold">Profil</h2>
      <p className="rounded bg-white/5 p-3">{user.email}</p>
      <button className="btn w-full" onClick={() => supabase.auth.signOut()}>Keluar</button>
    </div>
  )
}
