"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, ChevronDown, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EditProfileModal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isExpanded, setIsExpanded] = useState(false);

  const [name, setName] = useState("Naman Sharma");
  const [email, setEmail] = useState("[EMAIL_ADDRESS]");
  const [timezone, setTimezone] = useState("GMT-8");
  const [hours, setHours] = useState("10 AM - 6 PM");
  const [role, setRole] = useState("Project manager");

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const modalContent = (
    <motion.div
      layoutId="profile-modal-card"
      className={`w-full max-w-[800px] mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden font-sans border border-gray-100 dark:border-neutral-800 flex flex-col ${!isExpanded ? 'cursor-pointer hover:shadow-2xl transition-shadow' : ''}`}
      onClick={() => {
        if (!isExpanded) setIsExpanded(true);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-neutral-100">Edit your profile</h2>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Left Column - Form */}
        <div className="flex-1 p-6 border-r border-dashed border-gray-200 dark:border-neutral-800">
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onClick={(e) => isExpanded && e.stopPropagation()}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none focus:border-gray-300 dark:focus:border-neutral-600 text-gray-900 dark:text-neutral-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onClick={(e) => isExpanded && e.stopPropagation()}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none focus:border-gray-300 dark:focus:border-neutral-600 text-gray-900 dark:text-neutral-100"
              />
            </div>

            {/* Row: Timezone & Working Hours */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Timezone</label>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    onClick={(e) => isExpanded && e.stopPropagation()}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none focus:border-gray-300 dark:focus:border-neutral-600 appearance-none text-gray-900 dark:text-neutral-100"
                  >
                    <option>GMT-8</option>
                    <option>GMT-7</option>
                    <option>GMT-6</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Working hours</label>
                <div className="relative">
                  <input
                    type="text"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    onClick={(e) => isExpanded && e.stopPropagation()}
                    className="w-full pl-3 pr-8 py-2 text-[13px] border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none focus:border-gray-300 dark:focus:border-neutral-600 text-gray-900 dark:text-neutral-100"
                  />
                  <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onClick={(e) => isExpanded && e.stopPropagation()}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none focus:border-gray-300 dark:focus:border-neutral-600 appearance-none text-gray-900 dark:text-neutral-100"
                >
                  <option>Project manager</option>
                  <option>Software Engineer</option>
                  <option>Product Designer</option>
                  <option>Marketing Specialist</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="w-[200px] p-6 flex flex-col items-center">
          <span className="text-[11px] font-medium text-gray-400 mb-4 uppercase tracking-wider">Preview</span>

          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 flex items-center justify-center">
              <img
                src="/profile_picture.png"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-full shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-neutral-100 mb-0.5">{name || "Your Name"}</h3>
            <p className="text-[12px] text-gray-500 mb-3">{role || "Your Role"}</p>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-neutral-800 rounded-full border border-gray-100/50 dark:border-neutral-700/50">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">{hours || "No hours set"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50/50 dark:bg-neutral-900/50 px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 mt-auto">
        <span className="text-[11px] text-gray-400 font-medium">Last updated: {currentTime || "Loading..."}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="px-4 py-1.5 text-[13px] font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="px-4 py-1.5 text-[13px] font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 rounded-full transition-colors shadow-sm cursor-pointer"
          >
            Save changes
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className="w-full relative z-0 flex items-center justify-center">
        {!isExpanded && modalContent}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {isExpanded && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setIsExpanded(false)}
              />
              <div className="relative z-10 w-full max-w-[800px]">
                {modalContent}
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
