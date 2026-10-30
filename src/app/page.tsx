import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Planejamento de jornada, com clareza</p>
        <h1 id="page-title">Copiloto de Transição 6x1</h1>
        <p className="intro">
          Entenda os impactos da transição e compare alternativas para o seu
          negócio. As premissas informadas serão processadas no seu navegador.
        </p>
        <Link className="primary-button home-cta" href="/diagnostico/">
          Começar diagnóstico
        </Link>
      </section>
    </main>
  );
}
