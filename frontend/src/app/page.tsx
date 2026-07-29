import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Hero Section */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">AttendanceMaster</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="px-6 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 transition-colors">
            Register
          </Link>
          <Link href="/admin" className="px-6 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 transition-colors">
            Admin
          </Link>
          <Link href="/analytics" className="px-6 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 transition-colors">
            Analytics
          </Link>
          <Link href="/attendance" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <div>
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-6">
                Diploma Project 2026
              </span>
              <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                AI-Powered <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  Student Tracking
                </span>
                <br/>
                Made Simple.
              </h1>
            </div>
            
            <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
              Automate your classroom attendance with advanced face recognition. Upload a photo, detect students instantly, and sync with your university database.
            </p>

            <div className="flex gap-4 pt-4">
              <Link href="/attendance" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-1 transition-all">
                Get Started
              </Link>
              <Link href="/analytics" className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all">
                View Analytics
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-8 border-t border-slate-100">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    S{i}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Used by <span className="font-bold text-slate-900">500+ students</span> in beta tests
              </p>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-100 to-violet-100 rounded-3xl blur-3xl opacity-50 -z-10" />
            <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-2xl overflow-hidden shadow-indigo-100">
              <div className="aspect-[4/3] bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 p-8 text-center group hover:border-indigo-300 transition-colors">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Classroom Recognition Interface</h3>
                <p className="text-slate-500 mt-2 max-w-[200px]">Interactive preview of the student detection process</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 font-bold border border-slate-100">01</div>
              <h3 className="text-xl font-bold">Fast Recognition</h3>
              <p className="text-slate-500">Detect up to 100 students in a single high-resolution classroom photo using state-of-the-art AI.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 font-bold border border-slate-100">02</div>
              <h3 className="text-xl font-bold">Smart Analytics</h3>
              <p className="text-slate-500">View attendance trends, identify "at-risk" students, and generate semester reports automatically.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 font-bold border border-slate-100">03</div>
              <h3 className="text-xl font-bold">Mobile First</h3>
              <p className="text-slate-500">Optimized for both desktop and mobile devices. Perfect for teachers on the go.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
