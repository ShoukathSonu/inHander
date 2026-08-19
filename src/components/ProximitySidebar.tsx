"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

type Side = "left" | "right";
type SectionKind = "title" | "subtitle" | "section" | "body";
type SectionLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type ProximitySubItem = {
  id?: string;
  label: string;
};

export type ProximitySection = {
  id: string;
  label: string;
  kind?: SectionKind;
  level?: SectionLevel;
  bodyCount?: number;
  subItems?: (string | ProximitySubItem)[];
};

type DashPreset = {
  base: number;
  bump: number;
  thickness: number;
  className: string;
};

type FlattenedDash = {
  dashId: string;
  targetId: string;
  label: string;
  sectionKind: SectionKind;
  isMain: boolean;
};

type DashProps = {
  active: boolean;
  mouseY: MotionValue<number>;
  onSelect: (id: string) => void;
  registerDash: (id: string, node: HTMLButtonElement | null) => void;
  dash: FlattenedDash;
  side: Side;
};

type ProximitySidebarProps = {
  activeOffset?: number;
  className?: string;
  sections: ProximitySection[];
  side?: Side;
};

const RADIUS = 45;
const MAX_DASH_WIDTH = 110;
const SCROLL_IDLE_RESET_DELAY = 80;

const DASH_PRESETS: Record<SectionKind, DashPreset> = {
  title: {
    base: 44,
    bump: 66,
    thickness: 1.5,
    className: "bg-[#171717] dark:bg-white",
  },
  subtitle: {
    base: 38,
    bump: 58,
    thickness: 1.5,
    className: "bg-[#171717] dark:bg-white",
  },
  section: {
    base: 28,
    bump: 48,
    thickness: 1,
    className: "bg-[#737373] dark:bg-[#525252]",
  },
  body: {
    base: 20,
    bump: 42,
    thickness: 1,
    className: "bg-[#a3a3a3] dark:bg-[#383838]",
  },
};

const getSectionElement = (id: string) =>
  typeof document === "undefined" ? null : document.getElementById(id);

const getSectionKind = (section: ProximitySection): SectionKind => {
  if (section.kind) return section.kind;
  if (section.level === 1) return "title";
  if (section.level === 2) return "subtitle";
  if (section.level === 3) return "section";
  return "body";
};

const getScrollParent = (element: HTMLElement) => {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);

    if (/(auto|scroll|overlay)/.test(overflowY)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

const Dash = ({
  active,
  mouseY,
  onSelect,
  registerDash,
  dash,
  side,
}: DashProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const preset = DASH_PRESETS[dash.sectionKind];
  const activeWidth = preset.base + preset.bump;

  useEffect(() => {
    registerDash(dash.dashId, ref.current);
    return () => registerDash(dash.dashId, null);
  }, [registerDash, dash.dashId]);

  const distance = useTransform(mouseY, (y) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return RADIUS;
    return y - (rect.top + rect.height / 2);
  });

  const targetScaleX = useTransform(
    distance,
    [-RADIUS, 0, RADIUS],
    [
      preset.base / MAX_DASH_WIDTH,
      activeWidth / MAX_DASH_WIDTH,
      preset.base / MAX_DASH_WIDTH,
    ],
    { clamp: true }
  );

  const scaleX = useSpring(targetScaleX, {
    stiffness: 340,
    damping: 32,
    mass: 0.6,
  });

  return (
    <button
      ref={ref}
      type="button"
      aria-current={active && dash.isMain ? "location" : undefined}
      aria-label={`Go to ${dash.label}`}
      title={dash.label}
      className="group flex h-[7px] w-[110px] items-center justify-end border-0 bg-transparent p-0 outline-none cursor-pointer"
      onClick={() => onSelect(dash.targetId)}
    >
      <motion.span
        className={`block transition-colors duration-150 ease-out group-focus-visible:ring-2 group-focus-visible:ring-ring ${
          dash.isMain
            ? active
              ? "bg-[#171717] dark:bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]"
              : preset.className
            : active
            ? "bg-[#666666] dark:bg-[#737373]"
            : preset.className
        } group-hover:bg-[#171717] group-hover:dark:bg-white`}
        style={{
          height: preset.thickness,
          scaleX,
          transformOrigin: side === "left" ? "left center" : "right center",
          width: MAX_DASH_WIDTH,
        }}
      />
    </button>
  );
};

export const ProximitySidebar = ({
  activeOffset = 0.4,
  className = "",
  side = "right",
  sections,
}: ProximitySidebarProps) => {
  const mouseY = useMotionValue(Infinity);
  const shouldReduceMotion = useReducedMotion();
  const dashRefs = useRef(new Map<string, HTMLButtonElement>());
  const pointerInside = useRef(false);
  const resetTimer = useRef<number | null>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id);

  // Flatten sections into main title dashes and subordinate body dashes
  const flattenedDashes = useMemo<FlattenedDash[]>(() => {
    const list: FlattenedDash[] = [];

    sections.forEach((section) => {
      // 1. Main section header dash
      list.push({
        dashId: section.id,
        targetId: section.id,
        label: section.label,
        sectionKind: getSectionKind(section),
        isMain: true,
      });

      // 2. Subordinate body dashes
      if (section.subItems && section.subItems.length > 0) {
        section.subItems.forEach((sub, subIdx) => {
          const isObj = typeof sub === "object" && sub !== null;
          const subLabel = isObj ? sub.label : String(sub);
          const subTargetId = isObj && sub.id ? sub.id : section.id;
          list.push({
            dashId: `${section.id}-sub-${subIdx}`,
            targetId: subTargetId,
            label: subLabel,
            sectionKind: "body",
            isMain: false,
          });
        });
      } else {
        // Default to 5 subordinate lines if not explicitly provided
        const count = section.bodyCount ?? 5;
        for (let i = 0; i < count; i++) {
          list.push({
            dashId: `${section.id}-body-${i}`,
            targetId: section.id,
            label: `${section.label} · Detail ${i + 1}`,
            sectionKind: "body",
            isMain: false,
          });
        }
      }
    });

    return list;
  }, [sections]);

  const sectionIds = useMemo(
    () => sections.map((section) => section.id).join("|"),
    [sections]
  );

  const registerDash = useCallback(
    (id: string, node: HTMLButtonElement | null) => {
      if (node) {
        dashRefs.current.set(id, node);
        return;
      }
      dashRefs.current.delete(id);
    },
    []
  );

  const clearPendingReset = useCallback(() => {
    if (!resetTimer.current) return;
    window.clearTimeout(resetTimer.current);
    resetTimer.current = null;
  }, []);

  const setMouseToDash = useCallback(
    (id?: string) => {
      if (!id) {
        mouseY.set(Infinity);
        return;
      }

      const node = dashRefs.current.get(id);
      if (!node) return;

      const rect = node.getBoundingClientRect();
      mouseY.set(rect.top + rect.height / 2);
    },
    [mouseY]
  );

  const pulseDash = useCallback(
    (id?: string) => {
      setMouseToDash(id);
      clearPendingReset();

      if (!id || pointerInside.current) return;

      resetTimer.current = window.setTimeout(() => {
        mouseY.set(Infinity);
        resetTimer.current = null;
      }, SCROLL_IDLE_RESET_DELAY);
    },
    [clearPendingReset, mouseY, setMouseToDash]
  );

  const selectSection = useCallback(
    (id: string) => {
      const element = getSectionElement(id);
      if (!element) return;

      element.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "start",
      });

      window.history.replaceState(null, "", `#${id}`);
      setActiveId(id);
      pulseDash(id);
    },
    [pulseDash, shouldReduceMotion]
  );

  useEffect(() => () => clearPendingReset(), [clearPendingReset]);

  useEffect(() => {
    if (!sections.length) return;

    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;

      const anchorY = window.innerHeight * activeOffset;
      let nextActiveId = sections[0]?.id;
      let shortestDistance = Number.POSITIVE_INFINITY;

      for (const section of sections) {
        const element = getSectionElement(section.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        const containsAnchor = rect.top <= anchorY && rect.bottom >= anchorY;
        const distance = containsAnchor
          ? 0
          : Math.min(
              Math.abs(rect.top - anchorY),
              Math.abs(rect.bottom - anchorY)
            );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nextActiveId = section.id;
        }
      }

      setActiveId(nextActiveId);

      if (!pointerInside.current) {
        pulseDash(nextActiveId);
      }
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    const scrollParents = new Set<EventTarget>([window]);

    for (const section of sections) {
      const element = getSectionElement(section.id);
      if (element) scrollParents.add(getScrollParent(element));
    }

    updateActiveSection();

    for (const parent of scrollParents) {
      parent.addEventListener("scroll", scheduleUpdate, { passive: true });
    }

    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);

      for (const parent of scrollParents) {
        parent.removeEventListener("scroll", scheduleUpdate);
      }

      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeOffset, pulseDash, sectionIds, sections]);

  return (
    <nav
      aria-label="Page sections"
      className={`flex h-full min-h-0 items-center justify-end ${className}`}
    >
      <div
        className="mx-3 flex flex-col items-end py-2 select-none"
        onPointerMove={(event) => {
          clearPendingReset();
          pointerInside.current = true;
          mouseY.set(event.clientY);
        }}
        onPointerLeave={() => {
          pointerInside.current = false;
          mouseY.set(Infinity);
        }}
      >
        {flattenedDashes.map((dash) => (
          <Dash
            key={dash.dashId}
            active={dash.targetId === activeId}
            mouseY={mouseY}
            onSelect={selectSection}
            registerDash={registerDash}
            dash={dash}
            side={side}
          />
        ))}
      </div>
    </nav>
  );
};

export default ProximitySidebar;
