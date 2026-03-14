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
          <p className="text-orange-500 mb-4">Built with passion 🧡</p>
          <h1 className="text-5xl font-bold leading-tight">
            We built the Wavvy you always wanted, and we hope you love it as
            much as we do!
          </h1>
          <p>
            {" "}
            Wavvy started with a simple frustration — watching videos together
            while constantly saying "wait I'm 5 seconds ahead". We fixed that.
          </p>
        </section>
      </div>
    </>
  );
};

export default About;
