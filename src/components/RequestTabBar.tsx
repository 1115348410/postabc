import React, { useState, useRef, useEffect } from "react";
import type { RequestTab } from "../types";

interface RequestTabBarProps {
  tabs: RequestTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, newName: string) => void;
  onAddTab: () => void;
}

export default function RequestTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabRename,
  onAddTab,
}: RequestTabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isOverflowing, setIsOverflowing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousTabCountRef = useRef(0);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  useEffect(() => {
    const checkOverflow = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [tabs.length]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || tabs.length === 0) {
      previousTabCountRef.current = tabs.length;
      return;
    }

    const isTabAdded = tabs.length > previousTabCountRef.current;
    if (isTabAdded) {
      const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 0);
      el.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
    }

    previousTabCountRef.current = tabs.length;
  }, [tabs.length]);

  const handleDoubleClick = (tab: RequestTab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && editingName.trim()) {
      onTabRename(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  };

  const renderAddButton = (className?: string) => (
    <button
      onClick={onAddTab}
      className={`
        flex items-center justify-center gap-1.5
        px-3 h-8 mx-1
        rounded
        bg-primary-600 hover:bg-primary-700
        text-white font-medium text-sm
        transition-colors
        flex-shrink-0
        ${className || ""}
      `}
      title="新建接口"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span>新建</span>
    </button>
  );

  return (
    <div className="relative bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-thin">
        <div
          className={`flex items-center min-w-max ${isOverflowing ? "pr-24" : "pr-2"}`}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`
              group flex items-center gap-2 px-3 py-2 cursor-pointer
              border-r border-gray-200 dark:border-gray-800
              min-w-[120px] max-w-[200px]
              transition-colors
              ${
                activeTabId === tab.id
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              }
            `}
            >
              {/* Tab name (editable) */}
              {editingTabId === tab.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white dark:bg-gray-700 border border-primary-500 rounded px-1 py-0.5 text-sm focus:outline-none"
                />
              ) : (
                <span
                  onDoubleClick={() => handleDoubleClick(tab)}
                  className="flex-1 truncate text-sm select-none"
                  title={tab.name}
                >
                  {tab.name}
                  {tab.isModified && (
                    <span className="text-primary-500 ml-1">•</span>
                  )}
                </span>
              )}

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="
                opacity-0 group-hover:opacity-100
                p-0.5 rounded
                text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                transition-all
              "
                title="关闭"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}

          {!isOverflowing && renderAddButton()}
        </div>
      </div>

      {isOverflowing && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center pl-4 pr-1 bg-gradient-to-l from-gray-100 via-gray-100 to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent">
          {renderAddButton()}
        </div>
      )}
    </div>
  );
}
