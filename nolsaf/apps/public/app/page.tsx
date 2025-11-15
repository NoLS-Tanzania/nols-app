const API = process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:4000';

export default async function Page(){
  const res = await fetch(`${API}/api/public/properties`, { cache: 'no-store' });
  const data = await res.json().catch(()=>({ items: [] }));
  const items = data.items ?? [];

  return (
    <div className="container">
      <h1 className="py-20">Discover places to stay</h1>
      <p className="muted">Hand-picked properties listed by local owners.</p>

      <div className="grid">
        {items.map((p: any) => (
          <a key={p.id} href={`/property/${encodeURIComponent(p.id)}`} className="card">
            <img src={p.thumbnail ?? '/assets/sample/property-1.jpg'} alt={p.title} />
            <div className="card-content">
              <h2 className="card-title">{p.title}</h2>
              <div className="muted" style={{fontSize:13,marginTop:6}}>{p.location?.city}, {p.location?.region}</div>
              <div className="price">{p.currency} {p.pricePerNight} / night</div>
            </div>
          </a>
        ))}
      </div>
      {items.length===0 && <div className="py-20">No properties found. Make sure the API is running.</div>}
    </div>
  )
}
