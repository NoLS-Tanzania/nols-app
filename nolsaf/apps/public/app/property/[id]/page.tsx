import styles from './page.module.css';

interface Props { params: { id: string } }

const API = process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:4000';

export const metadata = async ({ params }: Props) => {
  try {
    const res = await fetch(`${API}/api/public/properties/${encodeURIComponent(params.id)}`, { cache: 'no-store' });
    const data = await res.json();
    return { title: data.item?.title ?? 'Property', description: data.item?.shortDescription ?? '' };
  } catch {
    return { title: 'Property', description: '' };
  }
}

export default async function Page({ params }: Props){
  const res = await fetch(`${API}/api/public/properties/${encodeURIComponent(params.id)}`, { cache: 'no-store' });
  const data = await res.json().catch(()=>({ item: null }));
  const p = data.item;

  return (
    <div className="container">
      <h1 className={styles.title}>{p.title}</h1>
      <div className={styles.location}>{p.location?.city}, {p.location?.region}</div>
      <div className={styles.content}>
        <div className={styles.imageContainer}>
          <img src={p.images?.[0] ?? '/assets/sample/property-1.jpg'} alt={p.title} className={styles.propertyImage} />
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.bookingCard}>
            <div className={styles.price}>{p.currency} {p.pricePerNight} / night</div>
            <a href={`/property/${params.id}/book`} className={styles.bookingButton}>Start booking</a>
          </div>
        </aside>
      </div>

      <section className={styles.description}>
        <h2>Description</h2>
        <p>{p.description}</p>
      </section>
    </div>
  )
}
