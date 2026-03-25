import {useState} from "react";

const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div 
      className={`relative rounded-2xl mb-4 p-[1px] group transition-all duration-500 overflow-hidden ${
        isOpen ? "shadow-[0_0_40px_-10px_rgba(249,115,22,0.3)] hover:-translate-y-1" : "hover:-translate-y-1"
      }`}
    >
      <span 
        className={`absolute inset-[-1000%] animate-[spin_4s_linear_infinite] transition-opacity duration-500 pointer-events-none ${
          isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        }`}
        style={{ backgroundImage: 'conic-gradient(from 90deg at 50% 50%, transparent 0%, #f97316 50%, transparent 100%)' }} 
      />
      
      <div 
        className={`relative bg-zinc-950 rounded-2xl border transition-colors duration-500 h-full w-full z-10 flex flex-col ${
          isOpen ? "border-transparent" : "border-zinc-800 group-hover:border-zinc-700"
        }`}
      >
        <button
          onClick={onToggle}
          className="w-full flex justify-between items-center p-6 text-left cursor-pointer transition-colors rounded-2xl relative z-20"
        >
          <span className={`font-semibold text-lg transition-colors duration-300 ${isOpen ? "text-orange-400" : "text-white group-hover:text-orange-200"}`}>
            {question}
          </span>
          <span className={`text-2xl transition-transform duration-500 flex items-center justify-center w-8 h-8 rounded-full ${isOpen ? "rotate-45 text-orange-400 bg-orange-500/10" : "text-gray-400 bg-white/5 group-hover:text-white"}`}>
            +
          </span>
        </button>

        <div 
          className={`grid transition-all duration-500 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden px-6 text-gray-400 leading-relaxed font-medium">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQItem;
