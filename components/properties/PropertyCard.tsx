"use client";

import { useState, useRef, useEffect } from "react";
import { Property, PropertyCategory } from "@/types/property";

interface PropertyCardProps {
  property: Property;
  index: number;
  onCategoryChange: (id: string, category: PropertyCategory | null) => void;
  onNotesChange: (id: string, notes: string | null) => void;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PropertyCard({
  property,
  index,
  onCategoryChange,
  onNotesChange,
}: PropertyCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(property.notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Defer time-dependent values to client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isNew =
    mounted &&
    !property.category &&
    Date.now() - new Date(property.first_seen_at).getTime() < DAY_MS;

  const listedTime = mounted ? relativeTime(property.first_visible_date) : "";
  const staggerClass = `stagger-${Math.min(index + 1, 9)}`;

  const handleNotesBlur = () => {
    setEditingNotes(false);
    const trimmed = notesDraft.trim() || null;
    if (trimmed !== property.notes) {
      onNotesChange(property.id, trimmed);
    }
  };

  const handleNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingNotes(true);
    setNotesDraft(property.notes ?? "");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const categoryBtn = (
    cat: PropertyCategory,
    label: string,
    icon: string,
    activeClass: string,
    hoverClass: string
  ) => {
    const isActive = property.category === cat;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onCategoryChange(property.id, isActive ? null : cat);
        }}
        className={`
          flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium
          transition-all duration-150
          ${isActive ? `${activeClass} scale-[0.97]` : `text-text-muted ${hoverClass}`}
        `}
        title={isActive ? `Remove from ${label}` : label}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div
      className={`animate-fade-in-up ${staggerClass} group bg-bg-card rounded-xl border border-border hover:border-border-hover hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
    >
      {/* Image */}
      <a
        href={property.listing_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative h-48 bg-bg-secondary overflow-hidden"
      >
        {property.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.image_url}
            alt={property.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
            No image
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Status badge */}
        {isNew && (
          <span className="absolute top-3 left-3 bg-accent-green text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded animate-pulse-subtle">
            New
          </span>
        )}
        {property.category === "wishlist" && (
          <span className="absolute top-3 left-3 bg-accent-gold text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            Wish List
          </span>
        )}
        {property.category === "called" && (
          <span className="absolute top-3 left-3 bg-accent-blue text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            Called
          </span>
        )}

        {/* Source badge */}
        <span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white/80 text-[10px] uppercase tracking-wider px-2 py-1 rounded">
          {property.source}
        </span>

        {/* Price + listed time overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="text-2xl font-display text-white drop-shadow-lg">
            £{property.price.toLocaleString()}
            <span className="text-sm text-white/70 font-body">/mo</span>
          </span>
          {listedTime && (
            <span className="text-[11px] text-white/60 font-body">{listedTime}</span>
          )}
        </div>
      </a>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-3 text-sm text-text-secondary font-body">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                {property.bedrooms} bed
              </span>
            )}
            {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
            {property.property_type && (
              <span className="text-text-muted capitalize">{property.property_type}</span>
            )}
          </div>
          <a
            href={property.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1.5 text-text-primary font-body text-sm leading-snug hover:text-accent transition-colors truncate"
          >
            {property.address}
          </a>
          {property.agent_name && (
            <p className="text-text-muted text-xs mt-1 truncate font-body">
              {property.agent_name}
            </p>
          )}
        </div>

        {/* Notes */}
        <div onClick={handleNotesClick} className="min-h-[32px]">
          {editingNotes ? (
            <textarea
              ref={textareaRef}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleNotesBlur}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingNotes(false);
                  setNotesDraft(property.notes ?? "");
                }
              }}
              placeholder="Add a note..."
              rows={2}
              className="w-full bg-bg-input text-text-primary text-xs font-body p-2 rounded border border-border focus:border-accent focus:outline-none resize-none"
            />
          ) : property.notes ? (
            <p className="text-xs text-text-secondary italic font-body p-2 bg-bg-secondary rounded border border-transparent hover:border-border-hover cursor-text transition-colors">
              {property.notes}
            </p>
          ) : (
            <p className="text-xs text-text-muted font-body p-2 rounded border border-transparent hover:border-border-hover cursor-text transition-colors">
              Add note...
            </p>
          )}
        </div>

        {/* Category buttons */}
        <div className="flex gap-1 mt-auto pt-1 border-t border-border">
          {categoryBtn(
            "bin", "Bin", "✕",
            "bg-red-50 text-accent-red border border-red-200",
            "hover:bg-red-50 hover:text-accent-red"
          )}
          {categoryBtn(
            "wishlist", "Wish List", "★",
            "bg-amber-50 text-accent-gold border border-amber-200",
            "hover:bg-amber-50 hover:text-accent-gold"
          )}
          {categoryBtn(
            "called", "Called", "✓",
            "bg-blue-50 text-accent-blue border border-blue-200",
            "hover:bg-blue-50 hover:text-accent-blue"
          )}
        </div>
      </div>
    </div>
  );
}
