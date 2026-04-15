import MembershipDashboard from "../components/MembershipDashboard";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";

type DashboardConfig = {
  screen_content: {
    status_banner: {
      check_in_status: string;
      intensity_level: string;
      current_day: string;
      streak_label: string;
    };
    stats_row: Array<{ id: string; label: string; value: string }>;
    weekly_activity_tracker: {
      days: string[];
      activities: Array<{ day: string; status: "complete" | "in-progress" | "empty" }>;
    };
    subscription_management: {
      subscription_status: {
        value: string;
        label: string;
      };
      actions: string[];
    };
    goals_row: Array<{ label: string; value: string; action?: string }>;
  };
};

const dashboardConfig: DashboardConfig = {
  screen_content: {
    status_banner: {
      check_in_status: "NOT CHECKED IN",
      intensity_level: "Moderate Crowd",
      current_day: "TUESDAY",
      streak_label: "3 DAY STREAK",
    },
    stats_row: [
      { id: "total", label: "Total sessions", value: "10" },
      { id: "month", label: "April Sessions", value: "4" },
      { id: "week", label: "First week sessions", value: "2" },
    ],
    weekly_activity_tracker: {
      days: ["M", "T", "W", "T", "F", "S", "S"],
      activities: [
        { day: "M", status: "complete" },
        { day: "T", status: "complete" },
        { day: "W", status: "complete" },
        { day: "T", status: "in-progress" },
        { day: "F", status: "empty" },
        { day: "S", status: "empty" },
        { day: "S", status: "empty" },
      ],
    },
    subscription_management: {
      subscription_status: {
        value: "4", 
        label: "DAYS LEFT",
      },
      actions: ["RENEW", "CHANGE"],
    },
    goals_row: [
      { label: "WEEKLY GOAL", value: "4x", action: "EDIT GOAL" },
      { label: "SESSIONS LEFT", value: "2" },
    ],
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { screen_content } = dashboardConfig;

  const daysLeft = parseInt(screen_content.subscription_management.subscription_status.value);
  const isExpiringSoon = daysLeft <= 5;

  const onSubscriptionAction = (action: string) => {
    if (action === "RENEW" || action === "CHANGE") {
      navigate("/subscription-tier");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0B] relative overflow-x-hidden">
      <AppTopBar />

      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-20 md:px-8 md:pt-24">
        
        {/* Row 1: Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-[#121217] px-6 py-8 md:py-10 text-white shadow-2xl border border-white/5">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 text-white opacity-[0.05]" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
          </svg>
          <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-xs font-bold tracking-widest text-white/50">
            <div className="flex items-center gap-1.5 sm:gap-2 uppercase">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white/20"></span>
              {screen_content.status_banner.check_in_status}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-orange-400">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-orange-500"></span>
              {screen_content.status_banner.intensity_level}
            </div>
          </div>
          <div className="relative z-10 mt-6 md:mt-8 flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-[#D4FF3F]">
              {screen_content.status_banner.current_day}
            </h1>
            <p className="mt-2 text-[10px] md:text-xs font-bold tracking-[0.3em] text-white/30 uppercase">
              {screen_content.status_banner.streak_label}
            </p>
          </div>
        </section>

        {/* Row 2: Stats */}
        <section className="mt-4 md:mt-5 grid grid-cols-3 gap-3 md:gap-5">
          {screen_content.stats_row.map((stat) => (
            <article key={stat.id} className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#121217] p-5 md:p-6 border border-white/5 flex flex-col justify-center">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-2 -right-2 h-16 w-16 text-white opacity-[0.05]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 18h4v-8H4zM10 18h4V6h-4zM16 18h4v-4h-4z" />
              </svg>
              <p className="relative z-10 text-3xl md:text-5xl font-bold text-[#D4FF3F]">{stat.value}</p>
              <div className="relative z-10 mt-2">
                <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-wider text-white/40 leading-tight">
                  {stat.label}
                </p>
              </div>
            </article>
          ))}
        </section>

        {/* Row 3: Split View */}
        <div className="mt-4 md:mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          
          <section className="relative overflow-hidden flex flex-col justify-center rounded-3xl bg-[#121217] p-5 md:p-8 border border-white/5 h-full">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 text-white opacity-[0.05]" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M5 18V9m5 9V6m5 12v-7m5 7v-4" />
            </svg>
            <h2 className="relative z-10 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-6 text-center lg:text-left">
              Weekly Activity
            </h2>
            <div className="relative z-10 flex justify-between sm:justify-around lg:justify-between items-end px-1 mt-auto">
              {screen_content.weekly_activity_tracker.activities.map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-3">
                  <div 
                    className={`h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl ${
                      item.status === 'complete' 
                        ? "bg-[#D4FF3F]"
                        : item.status === 'in-progress'
                        ? 'bg-[#D4FF3F]/10 relative overflow-hidden'
                        : 'bg-white/5'
                    }`}
                  />
                  <span className={`text-[10px] md:text-[11px] font-bold ${item.status === 'in-progress' ? 'text-[#D4FF3F]' : 'text-white/20'}`}>
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-5 h-full">
            {/* UPDATED EXPIRING SOON CARD */}
            <article 
              className={`relative overflow-hidden flex flex-col justify-between rounded-3xl p-5 md:p-6 border transition-all duration-300 h-full cursor-pointer 
                ${isExpiringSoon 
                  ? "bg-orange-500/5 border-orange-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
                  : "bg-[#121217] border-white/5 hover:bg-white/[0.02]"}`} 
              onClick={() => onSubscriptionAction("RENEW")}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className={`pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 opacity-[0.05] ${isExpiringSoon ? "text-orange-400" : "text-white"}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4v16M4 12h16" />
              </svg>
              
              <div className="relative z-10">
                <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center mb-4 transition-colors ${isExpiringSoon ? "bg-orange-500/20 text-orange-400 animate-pulse" : "bg-[#D4FF3F]/10 text-[#D4FF3F]"}`}>
                  {isExpiringSoon ? "!" : "⊕"}
                </div>
                
                {isExpiringSoon && (
                  <p className="text-[10px] font-black tracking-[0.2em] text-orange-500/90 mb-1">EXPIRING SOON</p>
                )}

                <div className="flex flex-baseline items-end gap-1.5">
                   <p className={`text-3xl md:text-4xl font-bold transition-colors ${isExpiringSoon ? "text-orange-400" : "text-white"}`}>
                    {screen_content.subscription_management.subscription_status.value}
                  </p>
                  <p className={`text-[11px] font-bold mb-1 transition-colors ${isExpiringSoon ? "text-orange-400/70" : "text-white/40"}`}>
                    DAYS
                  </p>
                </div>
                
                <p className="mt-1 text-[8px] md:text-[9px] font-bold text-white/20 uppercase tracking-[0.15em] leading-tight">
                  before membership expiry
                </p>
              </div>
            </article>

            {/* Weekly Goal Tile */}
            <article className="relative overflow-hidden flex flex-col justify-between rounded-3xl bg-[#121217] p-5 md:p-6 border border-white/5 h-full">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 text-white opacity-[0.05]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v5l3 2" />
              </svg>
              <div className="relative z-10">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-[#D4FF3F]/10 flex items-center justify-center mb-4 text-[#D4FF3F]">🕒</div>
                <p className="text-3xl md:text-4xl font-bold text-white">{screen_content.goals_row[0].value}</p>
                <p className="mt-1 text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-widest leading-tight">WEEKLY GOAL</p>
              </div>
            </article>
          </section>
        </div>

        <section className="mt-4 md:mt-5 overflow-hidden rounded-3xl opacity-80">
          <MembershipDashboard />
        </section>
      </main>
    </div>
  );
}