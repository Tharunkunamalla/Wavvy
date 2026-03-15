import {useState} from "react";

const FAQItem = ({question, answer}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-5 text-left hover:bg-zinc-900 transition"
      >
        <span className="font-medium">{question}</span>

        <span className="text-xl">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="p-5 text-gray-400 border-t border-zinc-800">
          {answer}
        </div>
      )}
    </div>
  );
};

export default FAQItem;
