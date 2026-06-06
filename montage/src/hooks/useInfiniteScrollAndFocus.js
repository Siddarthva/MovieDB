import { useState, useEffect, useRef, useCallback } from 'react';

export function useInfiniteScrollAndFocus(speed = 0.5, isPaused = false, direction = 1) {
  const ref = useRef(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const frameIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  const lastIndexRef = useRef(-1);

  const itemWidth = useRef(typeof window !== 'undefined' ? (window.innerWidth >= 640 ? 248 : 216) : 248);

  useEffect(() => {
    const handleResize = () => {
      itemWidth.current = window.innerWidth >= 640 ? 248 : 216;
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const animate = (time) => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (!ref.current || isPaused) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
        return;
      }

      const delta = Math.min(time - lastTimeRef.current, 32); // cap at 32ms to avoid jumps on tab switch
      lastTimeRef.current = time;

      const scroll = (speed * direction) * (delta / 16.67);
      ref.current.scrollLeft += scroll;

      const half = ref.current.scrollWidth / 2;
      if (direction === 1 && ref.current.scrollLeft >= half) {
        ref.current.scrollLeft -= half;
      } else if (direction === -1 && ref.current.scrollLeft <= 0) {
        ref.current.scrollLeft += half;
      }

      const center = ref.current.scrollLeft + ref.current.offsetWidth / 2;
      const index = Math.floor(center / itemWidth.current);
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        setFocusIndex(index);
      }
    };

    frameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      lastTimeRef.current = null;
    };
  }, [speed, isPaused, direction]);

  return { ref, focusIndex };
}
