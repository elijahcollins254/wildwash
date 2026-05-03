"use client";

import React, { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  showConfirmButton?: boolean;
}

export default function Modal({
  isOpen,
  title,
  message,
  type = "info",
  onClose,
  onConfirm,
  confirmText = "OK",
  showConfirmButton = false,
}: ModalProps) {
  // Close modal when Escape key is pressed
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />,
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          titleColor: "text-green-900 dark:text-green-100",
          textColor: "text-green-800 dark:text-green-300",
          buttonColor: "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />,
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          titleColor: "text-red-900 dark:text-red-100",
          textColor: "text-red-800 dark:text-red-300",
          buttonColor: "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          titleColor: "text-amber-900 dark:text-amber-100",
          textColor: "text-amber-800 dark:text-amber-300",
          buttonColor: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          titleColor: "text-blue-900 dark:text-blue-100",
          textColor: "text-blue-800 dark:text-blue-300",
          buttonColor: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
        };
    }
  };

  const styles = getStyles();

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`${styles.bgColor} ${styles.borderColor} border rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto transform transition-all duration-200`}
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-inherit">
            <div className="flex items-start gap-3 flex-1">
              {styles.icon}
              <h2
                id="modal-title"
                className={`text-lg font-semibold ${styles.titleColor}`}
              >
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`ml-2 p-1 rounded-lg ${styles.textColor} hover:bg-white/20 dark:hover:bg-white/10 transition-colors flex-shrink-0`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p id="modal-description" className={`${styles.textColor} text-sm leading-relaxed`}>
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-inherit justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${styles.textColor} hover:bg-white/20 dark:hover:bg-white/10`}
            >
              Close
            </button>
            {showConfirmButton && onConfirm && (
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${styles.buttonColor}`}
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
