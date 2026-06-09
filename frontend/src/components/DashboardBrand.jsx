export default function DashboardBrand({ title, description }) {
  return (
    <section className="dashboard-brand-banner">
      <img src="/ines-logo.png" alt="INES logo" />
      <div>
        <p className="eyebrow">INES-Ruhengeri</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}
