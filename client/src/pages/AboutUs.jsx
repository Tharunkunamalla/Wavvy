import {Play, Zap, Shield, Heart} from "lucide-react";

const About = () => {
  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* Nabar */}
        <nav className="flex justify-between items-center px-10 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Play className="text-orange-500" /> Wavvy
          </h1>

          <button 
            className="border border-orange-600 px-5 py-2 rounded-full hover:bg-orange-600"
            onClick={() => (window.location.href = "/")}
          >
            Back to Home
          </button>
        </nav>

        <section className="text-center max-w-4xl mx-auto mt-20 px-6">
          <div className="border border-orange-500 px-5 py-2 rounded-full inline-flex justify-center items-center gap-2 mb-6 shadow-lg shadow-orange-500/20">
            <p className="text-orange-500 mb-0">Built with passion 🧡</p>
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            We built the Wavvy you always wanted, and we hope you love it as
            much as we do!
          </h1>
          <p className="text-gray-400 mt-6 text-lg">
            {" "}
            Wavvy started with a simple frustration — watching videos together
            while constantly saying "wait I'm 5 seconds ahead". We fixed that.
          </p>
        </section>

        {/* Story + Features */}
        <section className="grid md:grid-cols-2 gap-16 max-w-6xl mx-auto mt-24 px-6">
          {/* story */}
          <div>
            <h2 className="text-3xl font-semibold mb-6">The Story</h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              {" "}
              Wavvy was born from a simple idea: to make it easy for people to
              watch videos together, no matter where they are.{" "}
            </p>
            <p className="text-gray-400 leading-relaxed">
              {" "}
              Our team of passionate developers and designers came together to
              create a platform that would solve this problem once and for
              all.{" "}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-zinc-900 p-6 rounded-xl border border-zince-800">
              <h3 className="text-lg font-semibold mb-4">
                Real-time Synchronization
              </h3>
              <p className="text-gray-400">
                Everyone Watches at the Same Time, No Matter Where They Are.
              </p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-xl border border-zince-800">
              <h3 className="text-lg font-semibold mb-4">Rooms for All</h3>
              <p className="text-gray-400">
                Invite anyone instantly to your video watching session.
              </p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-xl border border-zince-800">
              <h3 className="text-lg font-semibold mb-4">
                Any Video, Anywhere
              </h3>
              <p className="text-gray-400">
                Works with YouTube, Vimeo, and any video URL you can think of.
              </p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-xl border border-zince-800">
              <h3 className="text-lg font-semibold mb-4">Free Forever</h3>
              <p className="text-gray-400">
                No hidden fees, no subscriptions. Just pure video watching fun.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-5xl mx-auto mt-28 px-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>

            <p className="text-gray-400 text-lg">
              To make shared experiences feel truly shared — regardless of how
              many miles separate you.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-6xl mx-auto mt-24 px-6">
          <h2 className="text-3xl font-bold text-center mb-14">
            What We Stand For
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 text-center">
              <Zap className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Simplicity</h3>
              <p className="text-gray-400 mt-3 text-sm">
                No plugins. No downloads. Paste a link and watch instantly.
              </p>
            </div>

            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 text-center">
              <Shield className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Accessibility</h3>
              <p className="text-gray-400 mt-3 text-sm">
                Watching together should be free for everyone.
              </p>
            </div>

            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 text-center">
              <Heart className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Community</h3>
              <p className="text-gray-400 mt-3 text-sm">
                Built for friends, families, and fandoms.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mt-28 pb-20">
          <h2 className="text-3xl font-bold mb-6">Ready to watch together?</h2>

          <button
            className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            onClick={() => (window.location.href = "/")}
          >
            <Play size={18} /> Start Watching Free
          </button>

          <p className="text-gray-500 mt-10 text-sm">
            © 2026 Wavvy. Watch together, wherever you are.
          </p>
        </section>
      </div>
    </>
  );
};

export default About;
