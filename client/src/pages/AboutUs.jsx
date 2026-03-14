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
            className="border border-gray-300 px-5 py-2 rounded-full hover:bg-gray-900"
            onClick={() => (window.location.href = "/")}
          >
            Back to Home
          </button>
        </nav>

        <section className="text-center max-w-4xl mx-auto mt-20 px-6">
          <div className="border border-gray-300 px-5 py-2 rounded-full inline-flex justify-center items-center gap-2 mb-6">
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
      </div>
    </>
  );
};

export default About;
