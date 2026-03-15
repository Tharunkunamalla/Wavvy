import { useState, useRef } from "react";
import toast from "react-hot-toast";
import FAQItem from "../components/FAQItem.jsx";
import { Clock, Mail, Play, Loader2 } from "lucide-react";

const Contact = () => {

  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  const onSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);

    const formData = new FormData(formRef.current);
    formData.append("access_key", "2723b2e6-8e05-43c3-b81c-9583412ce099");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success) {

        toast.success("Message sent successfully!");

        formRef.current.reset();   // resets form properly

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
          onClick={() => window.location.href = "/"}
        >
          <Play className="text-orange-500" /> Wavvy
        </h1>

        <button
          className="border border-orange-600 px-5 py-2 rounded-full hover:bg-orange-600"
          onClick={() => window.location.href = "/"}
        >
          Back to Home
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mt-10">
        <p className="text-gray-400 border border-gray-700 inline-block px-4 py-1 rounded-full">
          We're here to help
        </p>

        <h1 className="text-5xl font-bold mt-5">
          Get in Touch
        </h1>

        <p className="text-gray-400 mt-4 max-w-xl mx-auto">
          Have a question, found a bug, or just want to say hi? We'd love to hear from you.
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
            <p className="text-gray-400">Usually within 24–48 hours</p>
            <p className="text-gray-500 mt-3 text-sm">
              We're a small team but we read every message.
            </p>
          </div>

        </div>


        {/* CONTACT FORM */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="bg-black p-8 rounded-2xl border border-zinc-800 shadow-lg shadow-orange-500/20"
        >

          <div className="grid grid-cols-2 gap-4">

            <input
              name="name"
              required
              placeholder="Your name"
              className="bg-zinc-800 p-3 rounded-md outline-none focus:border-orange-500 focus:border-2"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="bg-zinc-800 p-3 rounded-md outline-none focus:border-orange-500 focus:border-2"
            />

          </div>

          <input
            name="subject"
            placeholder="What's this about?"
            className="bg-zinc-800 p-3 rounded-md outline-none mt-4 w-full focus:border-orange-500 focus:border-2"
          />

          <textarea
            name="message"
            required
            placeholder="Tell us what's on your mind..."
            className="bg-zinc-800 p-3 rounded-md outline-none mt-4 w-full h-28 resize-none focus:border-orange-500 focus:border-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 mt-4 py-3 rounded-md flex items-center justify-center gap-2"
          >

            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Sending...
              </>
            ) : (
              "Send Message"
            )}

          </button>

          <p className="text-gray-500 text-sm mt-3 text-center">
            Or email directly at tharunkunamalla7@gmail.com
          </p>

        </form>

      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mt-20 px-6 w-full">

        <h2 className="text-center text-3xl font-bold mb-8">
          Frequently Asked Questions
        </h2>

        <FAQItem question="Is Wavvy free to use?" answer="Yes. Wavvy is completely free for watching videos with friends online." />
        <FAQItem question="What video platforms are supported?" answer="You can watch YouTube videos together using shared links." />
        <FAQItem question="How many people can join a room?" answer="There is no hard limit on room members." />
        <FAQItem question="Why is my video out of sync?" answer="Sync issues usually happen because of network delay." />
        <FAQItem question="How do I report a bug?" answer="You can send us a message using the contact form above." />

      </div>

      <footer className="text-center text-gray-500 mt-20 mb-6">
        © 2026 Wavvy. Watch together, wherever you are.
      </footer>

    </div>
  );
};

export default Contact;