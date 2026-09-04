import Link from "next/link";
import { AppHeader } from "@/components/app/app-header";
import { T } from "@/components/i18n/t";
import { WelcomeSlider } from "@/components/onboarding/welcome-slider";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <main className="relative">
      <WelcomeSlider />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-12%] h-[28rem] w-[28rem] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute right-[-10%] top-[8%] h-[22rem] w-[22rem] rounded-full bg-slate-300/35 blur-3xl" />
        <div className="absolute bottom-[-18%] left-1/3 h-[24rem] w-[36rem] rounded-full bg-slate-400/20 blur-3xl" />
      </div>

      <AppHeader>
        <p className="app-header-brand font-serif text-2xl tracking-tight text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">TalentMatch</p>
        <Link href="/login" className="ui-btn-secondary px-5 text-sm">
          <T k="home.signIn" />
        </Link>
      </AppHeader>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-8 pt-16 text-center sm:px-8 sm:pb-12 sm:pt-24 lg:pt-28">
        <p className="ui-kicker">
          <T k="home.kicker" />
        </p>
        <h1 className="mt-8 max-w-4xl font-serif text-[2.6rem] leading-[1.08] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[4.75rem]">
          TalentMatch
          <span className="mt-4 block font-serif text-[1.65rem] font-medium leading-[1.15] tracking-[-0.02em] text-ink/80 sm:mt-6 sm:text-4xl lg:text-[2.75rem]">
            <T k="home.tagline" />
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          <T k="home.intro" />
        </p>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-6 px-6 pb-16 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:pb-20 lg:pt-16">
        <Link
          href="/register?role=business"
          className="group rounded-[32px] border border-white/20 bg-white/60 p-8 shadow-[0_20px_60px_rgba(15,15,20,0.06)] backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/40 hover:bg-white/75 hover:shadow-[0_32px_80px_rgba(15,15,20,0.12)] sm:p-10"
        >
          <p className="ui-kicker">
            <T k="home.forSalons" />
          </p>
          <h2 className="mt-6 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            <T k="home.salonTitle" />
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft sm:text-base">
            <T k="home.salonBody" />
          </p>
          <span className="mt-10 inline-flex items-center text-sm font-medium text-ink transition duration-500 group-hover:translate-x-1">
            <T k="home.salonCta" />
            <span className="ml-2" aria-hidden>
              →
            </span>
          </span>
        </Link>

        <Link
          href="/register?role=customer"
          className="group rounded-[32px] border border-white/20 bg-white/60 p-8 shadow-[0_20px_60px_rgba(15,15,20,0.06)] backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/40 hover:bg-white/75 hover:shadow-[0_32px_80px_rgba(15,15,20,0.12)] sm:p-10"
        >
          <p className="ui-kicker">
            <T k="home.forModels" />
          </p>
          <h2 className="mt-6 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            <T k="home.modelTitle" />
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft sm:text-base">
            <T k="home.modelBody" />
          </p>
          <span className="mt-10 inline-flex items-center text-sm font-medium text-ink transition duration-500 group-hover:translate-x-1">
            <T k="home.modelCta" />
            <span className="ml-2" aria-hidden>
              →
            </span>
          </span>
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
