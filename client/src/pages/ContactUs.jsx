import {useState, useRef} from "react";
import toast from "react-hot-toast";
import FAQItem from "../components/FAQItem.jsx";
import {Clock, Mail, Play, Loader2} from "lucide-react";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const formRef = useRef(null);

  const onSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);

    const formData = new FormData(formRef.current);
    formData.append("access_key", "2723b2e6-8e05-43c3-b81c-9583412ce099");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Message sent successfully!");

        formRef.current.reset(); // resets form properly
      } else {
        toast.error(data.message || "Something went wrong!");
      }
    } catch (error) {
      toast.error("Network error. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <div className="flex justify-between items-center px-10 py-6">
        <h1
          className="text-2xl font-bold flex items-center gap-2 cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          <Play className="text-orange-500" /> Wavvy
        </h1>

        <button
          className="border border-orange-600 px-5 py-2 rounded-full hover:bg-orange-600"
          onClick={() => (window.location.href = "/")}
        >
          Back to Home
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mt-10">
        <p className="text-gray-400 border border-gray-700 inline-block px-4 py-1 rounded-full">
          We're here to help
        </p>

        <h1 className="text-5xl font-bold mt-5">Get in Touch</h1>

        <p className="text-gray-400 mt-4 max-w-xl mx-auto">
          Have a question, found a bug, or just want to say hi? We'd love to
          hear from you.
        </p>
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-10 mt-16 max-w-6xl mx-auto w-full">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-lg shadow-orange-500/20">
            <Mail className="text-orange-500 mb-4" size={28} />
            <h3 className="text-xl font-semibold mb-2">Email us directly</h3>
            <p className="text-gray-400">tharunkunamalla7@gmail.com</p>
            <p className="text-gray-500 mt-3 text-sm">
              For bug reports, feature requests, or anything else.
            </p>
          </div>

          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-lg shadow-orange-500/20">
            <Clock className="text-orange-500 mb-4" size={28} />
            <h3 className="text-xl font-semibold mb-2">Response time</h3>
            <p className="text-gray-400">Max: 24–48 hours</p>
            <p className="text-gray-500 mt-3 text-sm">
              We'll get back to you as soon as possible.
            </p>
          </div>
        </div>

        {/* CONTACT FORM */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="relative bg-zinc-900/40 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-zinc-800 shadow-[0_0_40px_-10px_rgba(249,115,22,0.1)] flex flex-col gap-5 overflow-hidden"
        >
          {/* Subtle inside glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/15 blur-[80px] rounded-full pointer-events-none" />

          <input type="hidden" name="from_name" value="Wavvy Contact Form" />
          <input
            type="hidden"
            name="subject"
            value="New Message from Wavvy 🚀"
          />
          <input type="hidden" name="greeting" value="Hello Wavvy 👋" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-10 w-full">
            <input
              name="name"
              required
              placeholder="Your name"
              className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-white placeholder:text-zinc-600"
            />
          </div>

          <input
            name="subject"
            placeholder="What's this about?"
            className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-white placeholder:text-zinc-600 z-10"
          />

          <textarea
            name="message"
            required
            placeholder="Tell us what's on your mind..."
            className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl outline-none h-32 resize-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium text-white placeholder:text-zinc-600 z-10"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer z-10 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>

          <p className="text-zinc-500/80 text-xs mt-3 text-center uppercase tracking-widest font-bold z-10">
            Or email directly at <span className="text-orange-500/80 hover:text-orange-400 transition-colors cursor-pointer">tharunkunamalla7@gmail.com</span>
          </p>
        </form>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mt-20 px-6 w-full">
        <h2 className="text-center text-3xl font-bold mb-8">
          Frequently Asked Questions
        </h2>

        {[
          {
            question: "Is Wavvy free to use?",
            answer: "Yeah, Wavvy is completely free for watching videos with friends online."
          },
          {
            question: "What video platforms are supported?",
            answer: "Basically, you can watch YouTube videos together using shared links. And we are working on adding more platforms soon."
          },
          {
            question: "How many people can join a room?",
            answer: <>There is no hard limit on room members. But we recommend keeping it under <span className="font-bold text-white">10</span> for a better experience.</>
          },
          {
            question: "Why is my video out of sync?",
            answer: "So, sync issues usually happen because of network delay. Try refreshing the page or ask everyone to join again."
          },
          {
            question: "How do I report a bug?",
            answer: "Yeah, you can send us a message using the contact form above. We'll get back to you as soon as possible."
          }
        ].map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openFaqIndex === index}
            onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
          />
        ))}
      </div>

      <footer className="text-center text-gray-500 mt-20 mb-6">
        © 2026 Wavvy. Watch together, wherever you are.
      </footer>
    </div>
  );
};

export default Contact;
