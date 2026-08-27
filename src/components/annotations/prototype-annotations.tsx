'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Crosshair, Eye, EyeOff, List, MousePointer2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { copyTextToClipboard } from '@/lib/client-clipboard';

type Annotation = {
  id: string;
  selector: string | null;
  leftSelector: string | null;
  rightSelector: string | null;
  leftOffset: number | null;
  rightOffset: number | null;
  anchorRelative: boolean;
  anchorVersion: number;
  pagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  requirement: string;
  keep: string | null;
};

type Marker = Annotation & { left: number; top: number; markerWidth: number; markerHeight: number; ordinal: number };
type InteractionStep = { selector: string; text: string; kind?: 'navigation' | 'action' };

function elementSelector(element: Element) {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== 'body' && parts.length < 6) {
    let part = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (parent) {
      const tagName = current.tagName;
      const siblings = Array.from(parent.children).filter((child) => child.tagName === tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
}

function framePageState(win: Window) {
  const doc = win.document;
  const visibleText = (element: Element) => {
    if (!isVisible(element, win)) return '';
    return (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  };
  const activeLabels = Array.from(doc.querySelectorAll(
    '[aria-current="page"], [aria-selected="true"], [data-state="active"], .active, .is-active, .selected',
  )).map(visibleText).filter(Boolean).slice(0, 4);
  const headings = Array.from(doc.querySelectorAll('h1, h2, [role="heading"]'))
    .map(visibleText).filter(Boolean).slice(0, 3);
  const state = [...new Set([...activeLabels, ...headings])].join('|');
  const navigationElement = Array.from(doc.querySelectorAll(
    'nav [aria-current="page"], aside [aria-current="page"], [role="tab"][aria-selected="true"], nav .active, aside .active, nav .selected, aside .selected',
  )).find((element) => Boolean(visibleText(element))) || null;
  return {
    key: `${win.location.pathname}${win.location.hash}::${state}`,
    path: `${win.location.pathname}${win.location.search}${win.location.hash}`,
    navigationText: navigationElement ? visibleText(navigationElement) : '',
  };
}

function encodePageState(win: Window, interactionTrail: InteractionStep[] = []) {
  return `@ui:${encodeURIComponent(JSON.stringify({ ...framePageState(win), interactionTrail }))}`;
}

function decodePageState(value: string) {
  if (!value.startsWith('@ui:')) return { key: value, path: '', navigationText: '', interactionTrail: [] as InteractionStep[] };
  try {
    const decoded = JSON.parse(decodeURIComponent(value.slice(4))) as { key: string; path: string; navigationText: string; interactionTrail?: InteractionStep[] };
    return { ...decoded, interactionTrail: decoded.interactionTrail || [] };
  } catch {
    return { key: value, path: '', navigationText: '', interactionTrail: [] as InteractionStep[] };
  }
}

function isVisible(element: Element, win: Window) {
  const style = win.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

function preferredClickTarget(target: Element, win: Window) {
  const actionable = target.closest('input, button, select, textarea, a, [role="button"], [role="tab"], [role="menuitem"]');
  if (actionable) return actionable;

  const targetRect = target.getBoundingClientRect();
  const viewportArea = Math.max(win.innerWidth * win.innerHeight, 1);
  let fallback: Element | null = null;
  let current: Element | null = target;
  while (current && current.tagName.toLowerCase() !== 'body') {
    const rect = current.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (rect.width >= 16 && rect.height >= 12 && area <= viewportArea * 0.92) {
      const role = current.getAttribute('role') || '';
      const classTokens = (current.getAttribute('class') || '').toLowerCase().split(/\s+/);
      const tag = current.tagName.toLowerCase();
      const preciseText = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'li', 'dt', 'dd',
        'legend', 'figcaption', 'strong', 'small', 'code', 'span',
      ].includes(tag) && rect.width >= 24;
      const meaningfulSubregion = classTokens.some((token) => (
        /(^|[-_])(header|footer|head|foot|body|content|title|subtitle|description|text|label|legend|axis|series|bar|row)([-_]|$)/.test(token)
      ));
      if (preciseText || meaningfulSubregion) return current;
      const meaningfulClass = classTokens.some((token) => (
        token === 'modal'
        || token === 'dialog'
        || token.endsWith('-modal')
        || token.endsWith('_modal')
        || token === 'card'
        || token.endsWith('-card')
        || token.endsWith('_card')
        || token === 'chart'
        || token.endsWith('-chart')
        || token.endsWith('_chart')
        || token === 'graph'
        || token === 'plot'
        || token === 'panel'
        || token.endsWith('-panel')
      ));
      if (
        rect.width >= 64
        && rect.height >= 40
        && (meaningfulClass
          || ['dialog', 'region', 'group'].includes(role)
          || ['section', 'article', 'figure', 'table', 'canvas'].includes(tag))
      ) return current;
      if (!fallback && rect.width >= targetRect.width * 2 && rect.height >= targetRect.height * 2) fallback = current;
    }
    current = current.parentElement;
  }
  return fallback || target;
}

function findHorizontalAnchor(doc: Document, startX: number, y: number, direction: 1 | -1, maxDistance: number) {
  for (let distance = 2; distance <= maxDistance; distance += 4) {
    const hit = doc.elementFromPoint(startX + distance * direction, y);
    if (!hit) continue;
    const preferred = hit.closest('input, button, select, textarea, a, [role="button"], [role="tab"]') || hit;
    const rect = preferred.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.width <= maxDistance * 2.5) return preferred;
  }
  return null;
}

export function PrototypeAnnotations({
  projectId,
  versionId,
  iframeSrc,
  mode,
  deviceClassName = 'w-full h-full rounded-xl',
  shareUrl,
  initialPanelOpen = true,
}: {
  projectId: string;
  versionId: string;
  iframeSrc: string;
  mode: 'edit' | 'view';
  deviceClassName?: string;
  shareUrl?: string;
  initialPanelOpen?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const interactionTrailRef = useRef<InteractionStep[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Annotation | null>(null);
  const [draft, setDraft] = useState<{ selector: string | null; leftSelector?: string | null; rightSelector?: string | null; leftOffset?: number | null; rightOffset?: number | null; anchorRelative: boolean; anchorVersion: number; x: number; y: number; width: number; height: number; pagePath: string } | null>(null);
  const [dragBox, setDragBox] = useState<{ startX: number; startY: number; x: number; y: number; width: number; height: number } | null>(null);
  const [draftHighlight, setDraftHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [requirement, setRequirement] = useState('');
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(initialPanelOpen);
  const [annotationViewEnabled, setAnnotationViewEnabled] = useState(mode === 'edit' || initialPanelOpen);

  const cancelEmptyDraft = useCallback(() => {
    if (!draft || requirement.trim()) return;
    setDraft(null);
    setDraftHighlight(null);
    setDragBox(null);
    setSelecting(false);
    setRequirement('');
  }, [draft, requirement]);

  const loadAnnotations = useCallback(async () => {
    const response = await fetch(`/api/ui-annotations?versionId=${encodeURIComponent(versionId)}`);
    if (response.ok) setAnnotations(await response.json());
  }, [versionId]);

  useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  const updateMarkers = useCallback(() => {
    const frame = iframeRef.current;
    const wrap = frameWrapRef.current;
    if (!frame?.contentDocument || !frame.contentWindow || !wrap) return;
    const doc = frame.contentDocument;
    const documentElement = doc.documentElement;
    if (!documentElement) return;
    const pagePath = framePageState(frame.contentWindow).key;
    const frameRect = frame.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const docWidth = Math.max(documentElement.scrollWidth, 1);
    const docHeight = Math.max(documentElement.scrollHeight, 1);
    setMarkers(annotations.flatMap((item, annotationIndex) => {
      if (decodePageState(item.pagePath).key !== pagePath) return [];
      const target = item.selector ? doc.querySelector(item.selector) : null;
      if (target && isVisible(target, frame.contentWindow!)) {
        const targetRect = target.getBoundingClientRect();
        if (item.anchorRelative) {
          const markerTop = item.anchorVersion >= 3
            ? targetRect.top + item.y
            : targetRect.top + item.y * (item.anchorVersion === 2 ? targetRect.width : targetRect.height);
          const markerHeight = item.anchorVersion >= 3
            ? item.height
            : item.height * (item.anchorVersion === 2 ? targetRect.width : targetRect.height);
          const leftAnchor = item.anchorVersion === 4 && item.leftSelector ? doc.querySelector(item.leftSelector) : null;
          const rightAnchor = item.anchorVersion === 4 && item.rightSelector ? doc.querySelector(item.rightSelector) : null;
          const leftAnchorRect = leftAnchor && isVisible(leftAnchor, frame.contentWindow!) ? leftAnchor.getBoundingClientRect() : null;
          const rightAnchorRect = rightAnchor && isVisible(rightAnchor, frame.contentWindow!) ? rightAnchor.getBoundingClientRect() : null;
          const markerLeft = leftAnchorRect && item.leftOffset !== null
            ? leftAnchorRect.left + item.leftOffset
            : targetRect.left + item.x * targetRect.width;
          const markerRight = rightAnchorRect && item.rightOffset !== null
            ? rightAnchorRect.right + item.rightOffset
            : markerLeft + item.width * targetRect.width;
          return [{
            ...item,
            ordinal: annotationIndex + 1,
            left: frameRect.left - wrapRect.left + markerLeft,
            top: frameRect.top - wrapRect.top + markerTop,
            markerWidth: Math.max(markerRight - markerLeft, 1),
            markerHeight,
          }];
        }
        return [{
          ...item,
          ordinal: annotationIndex + 1,
          left: frameRect.left - wrapRect.left + item.x * docWidth - frame.contentWindow!.scrollX,
          top: frameRect.top - wrapRect.top + item.y * docHeight - frame.contentWindow!.scrollY,
          markerWidth: item.width * docWidth,
          markerHeight: item.height * docHeight,
        }];
      }
      if (item.selector) return [];
      return [{
        ...item,
        ordinal: annotationIndex + 1,
        left: frameRect.left - wrapRect.left + item.x * docWidth - frame.contentWindow!.scrollX,
        top: frameRect.top - wrapRect.top + item.y * docHeight - frame.contentWindow!.scrollY,
        markerWidth: item.width * docWidth,
        markerHeight: item.height * docHeight,
      }];
    }));
  }, [annotations]);

  const attachFrameListeners = useCallback(() => {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!frame || !win || !doc?.body) return;
    const onScroll = () => updateMarkers();
    const clearHighlight = () => {
      cancelEmptyDraft();
      setSelected(null);
      window.setTimeout(updateMarkers, 0);
      window.setTimeout(updateMarkers, 350);
    };
    const recordInteraction = (event: MouseEvent) => {
      if (mode !== 'edit') return;
      const clicked = event.target as Element | null;
      const actionable = clicked?.closest('a, button, [role="button"], [role="tab"], [role="menuitem"]');
      if (!actionable) return;
      const step = {
        selector: elementSelector(actionable),
        text: (actionable.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        kind: actionable.closest('nav, aside') ? 'navigation' as const : 'action' as const,
      };
      const trail = interactionTrailRef.current;
      const previous = trail[trail.length - 1];
      if (previous?.selector === step.selector && previous.text === step.text) return;
      interactionTrailRef.current = step.kind === 'navigation'
        ? [step]
        : [...trail, step].slice(-20);
    };
    win.addEventListener('scroll', onScroll, { passive: true });
    win.addEventListener('resize', onScroll);
    win.addEventListener('hashchange', clearHighlight);
    win.addEventListener('popstate', clearHighlight);
    doc.addEventListener('pointerdown', clearHighlight, true);
    doc.addEventListener('click', recordInteraction, true);
    updateMarkers();
    return () => {
      win.removeEventListener('scroll', onScroll);
      win.removeEventListener('resize', onScroll);
      win.removeEventListener('hashchange', clearHighlight);
      win.removeEventListener('popstate', clearHighlight);
      doc.removeEventListener('pointerdown', clearHighlight, true);
      doc.removeEventListener('click', recordInteraction, true);
    };
  }, [cancelEmptyDraft, mode, updateMarkers]);

  useEffect(() => {
    const cleanup = attachFrameListeners();
    return cleanup;
  }, [attachFrameListeners]);

  useEffect(() => { updateMarkers(); }, [updateMarkers, panelOpen, deviceClassName]);

  useEffect(() => {
    if (!selecting) return;
    const cancelSelection = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDragBox(null);
      setSelecting(false);
    };
    window.addEventListener('keydown', cancelSelection);
    return () => window.removeEventListener('keydown', cancelSelection);
  }, [selecting]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const startY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    setDragBox({ startX, startY, x: startX, y: startY, width: 0, height: 0 });
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragBox) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const pointerY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    setDragBox({
      ...dragBox,
      x: Math.min(dragBox.startX, pointerX),
      y: Math.min(dragBox.startY, pointerY),
      width: Math.abs(pointerX - dragBox.startX),
      height: Math.abs(pointerY - dragBox.startY),
    });
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragBox) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    const layerRect = event.currentTarget.getBoundingClientRect();
    const wrapRect = frameWrapRef.current?.getBoundingClientRect();
    if (!frame || !doc || !win) {
      setDragBox(null);
      return;
    }
    const docWidth = Math.max(doc.documentElement.scrollWidth, layerRect.width, 1);
    const docHeight = Math.max(doc.documentElement.scrollHeight, layerRect.height, 1);
    const isClick = dragBox.width < 8 && dragBox.height < 8;
    if (isClick) {
      const hit = doc.elementFromPoint(dragBox.startX, dragBox.startY);
      const target = hit ? preferredClickTarget(hit, win) : null;
      const targetRect = target?.getBoundingClientRect();
      if (!target || !targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
        setDragBox(null);
        return;
      }
      setDraft({
        selector: elementSelector(target),
        anchorRelative: true,
        anchorVersion: 3,
        pagePath: encodePageState(win, interactionTrailRef.current),
        x: 0,
        y: 0,
        width: 1,
        height: targetRect.height,
      });
      if (wrapRect) {
        setDraftHighlight({
          left: layerRect.left - wrapRect.left + targetRect.left,
          top: layerRect.top - wrapRect.top + targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
        });
      }
      setDragBox(null);
      setSelecting(false);
      setPanelOpen(true);
      return;
    }
    let anchor = doc.elementFromPoint(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
    while (anchor?.parentElement) {
      const rect = anchor.getBoundingClientRect();
      const coversSelection = rect.left <= dragBox.x
        && rect.top <= dragBox.y
        && rect.right >= dragBox.x + dragBox.width
        && rect.bottom >= dragBox.y + dragBox.height;
      if (coversSelection && rect.width > 0 && rect.height > 0) break;
      anchor = anchor.parentElement;
    }
    const anchorRect = anchor?.getBoundingClientRect();
    const anchorRelative = Boolean(anchor && anchorRect && anchorRect.width > 0 && anchorRect.height > 0);
    const middleY = dragBox.y + dragBox.height / 2;
    const edgeSearchDistance = Math.min(Math.max(dragBox.width / 2, 24), 160);
    const leftAnchor = findHorizontalAnchor(doc, dragBox.x, middleY, 1, edgeSearchDistance);
    const rightAnchor = findHorizontalAnchor(doc, dragBox.x + dragBox.width, middleY, -1, edgeSearchDistance);
    const leftAnchorRect = leftAnchor?.getBoundingClientRect();
    const rightAnchorRect = rightAnchor?.getBoundingClientRect();
    setDraft({
      selector: anchor ? elementSelector(anchor) : null,
      leftSelector: leftAnchor ? elementSelector(leftAnchor) : null,
      rightSelector: rightAnchor ? elementSelector(rightAnchor) : null,
      leftOffset: leftAnchorRect ? dragBox.x - leftAnchorRect.left : null,
      rightOffset: rightAnchorRect ? dragBox.x + dragBox.width - rightAnchorRect.right : null,
      anchorRelative,
      anchorVersion: 4,
      pagePath: encodePageState(win, interactionTrailRef.current),
      x: anchorRelative ? (dragBox.x - anchorRect!.left) / anchorRect!.width : (dragBox.x + win.scrollX) / docWidth,
      y: anchorRelative ? dragBox.y - anchorRect!.top : (dragBox.y + win.scrollY) / docHeight,
      width: anchorRelative ? dragBox.width / anchorRect!.width : dragBox.width / docWidth,
      height: anchorRelative ? dragBox.height : dragBox.height / docHeight,
    });
    if (wrapRect) {
      setDraftHighlight({
        left: layerRect.left - wrapRect.left + dragBox.x,
        top: layerRect.top - wrapRect.top + dragBox.y,
        width: dragBox.width,
        height: dragBox.height,
      });
    }
    setDragBox(null);
    setSelecting(false);
    setPanelOpen(true);
  };

  const save = async () => {
    if (!draft || !requirement.trim()) return;
    setSaving(true);
    const response = await fetch('/api/ui-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, versionId, ...draft, requirement }),
    });
    setSaving(false);
    if (!response.ok) return toast.error('保存标注失败');
    setDraft(null);
    setDraftHighlight(null);
    setRequirement('');
    await loadAnnotations();
    toast.success('已添加 UI 标注');
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/ui-annotations/${id}`, { method: 'DELETE' });
    if (!response.ok) return toast.error('删除标注失败');
    if (selected?.id === id) setSelected(null);
    await loadAnnotations();
  };

  const replayInteractionTrail = async (win: Window, steps: InteractionStep[]) => {
    for (const step of steps) {
      const doc = win.document;
      const bySelector = doc.querySelector(step.selector);
      const byText = step.text
        ? Array.from(doc.querySelectorAll('a, button, [role="button"], [role="tab"], [role="menuitem"]')).find((element) => (
          isVisible(element, win)
          && (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100) === step.text
        ))
        : null;
      const target = (bySelector && isVisible(bySelector, win) ? bySelector : byText) as HTMLElement | null | undefined;
      if (!target) return false;
      target.click();
      await new Promise((resolve) => window.setTimeout(resolve, 260));
    }
    return true;
  };

  const dismissTransientUi = async (win: Window) => {
    const layerSelector = [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '.modal-backdrop',
      '.inline-modal',
      '.el-dialog__wrapper',
      '.ant-modal-wrap',
      '[class*="modal"][class*="overlay"]',
      '[class*="dialog"][class*="wrapper"]',
    ].join(', ');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const layers = Array.from(win.document.querySelectorAll(layerSelector)).filter((element) => isVisible(element, win));
      const layer = layers[layers.length - 1];
      if (!layer) return;
      const controls = Array.from(layer.querySelectorAll('button, [role="button"], [aria-label], [title], .close, [class*="close"]'));
      const closeControl = controls.find((element) => {
        if (!isVisible(element, win)) return false;
        const label = [
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.textContent,
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        return /^(关闭|取消|close|cancel|×|✕)$/i.test(label) || /(^|[-_ ])close($|[-_ ])/i.test(element.className || '');
      }) as HTMLElement | undefined;
      if (closeControl) closeControl.click();
      else win.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 160));
    }
  };

  const locate = async (item: Annotation) => {
    cancelEmptyDraft();
    if (selected?.id === item.id) {
      setSelected(null);
      return;
    }
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const targetState = decodePageState(item.pagePath);
    if (targetState.key !== framePageState(win).key) {
      setSelected(null);
      await dismissTransientUi(win);
      const doc = win.document;
      if (targetState.key === framePageState(win).key) {
        setSelected(item);
        const target = item.selector ? doc.querySelector(item.selector) : null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        updateMarkers();
        return;
      }
      const navigationTarget = targetState.navigationText
        ? Array.from(doc.querySelectorAll('a, button, [role="tab"], [role="menuitem"]')).find((element) => (
          isVisible(element, win)
          && (element.textContent || '').replace(/\s+/g, ' ').trim() === targetState.navigationText
        )) as HTMLElement | undefined
        : undefined;
      if (navigationTarget) {
        const lastNavigationIndex = targetState.interactionTrail.reduce((lastIndex, step, index) => {
          if (step.kind === 'navigation') return index;
          const recordedTarget = doc.querySelector(step.selector);
          return recordedTarget?.closest('nav, aside') ? index : lastIndex;
        }, -1);
        const followUpSteps = targetState.interactionTrail.slice(lastNavigationIndex + 1);
        navigationTarget.click();
        toast.info(`正在前往「${targetState.navigationText}」`);
        await new Promise((resolve) => window.setTimeout(resolve, 260));
        const followedUp = followUpSteps.length === 0 || await replayInteractionTrail(win, followUpSteps);
        if (followedUp && targetState.key === framePageState(win).key) {
          setSelected(item);
          const target = item.selector ? doc.querySelector(item.selector) : null;
          target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          updateMarkers();
          return;
        }
      }
      if (targetState.interactionTrail.length > 0) {
        toast.info('正在进入标注所在位置');
        const replayed = await replayInteractionTrail(win, targetState.interactionTrail);
        if (replayed && targetState.key === framePageState(win).key) {
          setSelected(item);
          const target = item.selector ? doc.querySelector(item.selector) : null;
          target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          updateMarkers();
          return;
        }
      }
      if (targetState.path && targetState.path !== `${win.location.pathname}${win.location.search}${win.location.hash}`) {
        win.location.assign(targetState.path);
        toast.info('正在前往标注所在页面');
        return;
      }
      toast.info('无法自动定位，请先进入这条标注所在的原型页面');
      return;
    }
    setSelected(item);
    const target = item.selector ? iframeRef.current?.contentDocument?.querySelector(item.selector) : null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(updateMarkers, 350);
  };

  return (
    <div className="flex h-full min-h-0 w-full bg-gray-50">
      <div ref={frameWrapRef} className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-3">
        <div className={`relative overflow-hidden bg-white shadow-sm transition-all duration-300 ${deviceClassName}`}>
          <iframe ref={iframeRef} src={iframeSrc} onLoad={attachFrameListeners} className="h-full w-full border-0" title="Prototype Preview" sandbox="allow-scripts allow-same-origin allow-popups allow-modals" />
          {mode === 'edit' && selecting && (
            <div
              className={`absolute inset-0 z-30 touch-none select-none bg-violet-500/[0.02] ${
                dragBox && (dragBox.width >= 8 || dragBox.height >= 8) ? 'cursor-crosshair' : 'cursor-pointer'
              }`}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={() => setDragBox(null)}
              aria-label="单击选择元素或拖拽框选需要 UI 设计的区域"
            >
              {dragBox && (
                <div
                  className="pointer-events-none absolute rounded-md border-2 border-violet-600 bg-violet-500/15 shadow-[0_0_0_9999px_rgba(17,24,39,0.08)]"
                  style={{ left: dragBox.x, top: dragBox.y, width: dragBox.width, height: dragBox.height }}
                />
              )}
              {!dragBox && (
                <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-gray-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  单击选择元素，或拖拽框选区域 · Esc 取消
                </div>
              )}
            </div>
          )}
        </div>
        {(mode === 'edit' || annotationViewEnabled) && markers.map((marker) => (
          <div
            key={marker.id}
            className={`pointer-events-none absolute z-20 rounded-md border-2 transition-colors ${selected?.id === marker.id ? 'border-violet-600 bg-violet-500/15' : 'border-transparent bg-transparent'}`}
            style={{ left: marker.left, top: marker.top, width: Math.max(marker.markerWidth, 24), height: Math.max(marker.markerHeight, 24) }}
          >
            <button
              type="button"
              onClick={() => locate(marker)}
              className="pointer-events-auto absolute -right-2 -top-3 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-violet-700"
              aria-label={`查看标注 U${String(marker.ordinal).padStart(2, '0')}`}
            >
              U{String(marker.ordinal).padStart(2, '0')}
            </button>
          </div>
        ))}
        {draftHighlight && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border-2 border-violet-600 bg-violet-500/15"
            style={{ left: draftHighlight.left, top: draftHighlight.top, width: draftHighlight.width, height: draftHighlight.height }}
          >
            <span className="absolute -right-2 -top-3 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">新标注</span>
          </div>
        )}
        {mode === 'view' ? (
          <div className="absolute right-5 top-5 z-30">
            {annotationViewEnabled ? (
              <div className="flex items-center overflow-hidden rounded-lg border border-violet-200 bg-white shadow-md">
              <button
                onClick={() => {
                  setAnnotationViewEnabled(false);
                  setPanelOpen(false);
                  setSelected(null);
                }}
                className="flex items-center gap-1.5 bg-violet-600 px-2.5 py-2 text-xs font-medium text-white hover:bg-violet-700"
                title="切换到普通查看"
              >
                <EyeOff className="h-3.5 w-3.5" /> 查看模式
              </button>
                <button
                  onClick={() => setPanelOpen((value) => !value)}
                  className={`flex items-center gap-1 border-l border-violet-100 px-2.5 py-2 text-xs font-medium ${panelOpen ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  title={panelOpen ? '收起标注清单' : '展开标注清单'}
                >
                  <List className="h-3.5 w-3.5" /> {annotations.length || 0}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAnnotationViewEnabled(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5" /> UI 模式
              </button>
            )}
          </div>
        ) : !panelOpen ? (
          <button onClick={() => setPanelOpen(true)} className="absolute right-5 top-5 z-30 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md">
            <List className="h-4 w-4" /> UI 标注 {annotations.length || ''}
          </button>
        ) : null}
      </div>

      {panelOpen && (
        <aside className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900">UI 标注</h2>
              <p className="text-xs text-gray-400">{annotations.length} 个高保真区域</p>
            </div>
            <button onClick={() => {
              setPanelOpen(false);
              setSelected(null);
            }} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>

          {mode === 'edit' && (
            <div className="border-b border-gray-100 p-3">
              <button onClick={() => {
                setSelected(null);
                setDragBox(null);
                setDraft(null);
                setDraftHighlight(null);
                setSelecting((value) => !value);
              }} className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${selecting ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                {selecting ? <MousePointer2 className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />}
                {selecting ? '单击或拖拽选择区域' : '添加标注'}
              </button>
              {shareUrl && (
                <button onClick={async () => { await copyTextToClipboard(shareUrl); toast.success('标注查看链接已复制'); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50">
                  <Copy className="h-3.5 w-3.5" /> 复制给 UI 的查看链接
                </button>
              )}
            </div>
          )}

          {draft && mode === 'edit' && (
            <div className="border-b border-violet-100 bg-violet-50/60 p-3">
              <p className="mb-2 text-xs font-semibold text-violet-800">新标注</p>
              <textarea value={requirement} onChange={(event) => setRequirement(event.target.value)} rows={3} maxLength={1000} placeholder="UI 需要做什么？" className="input-sm resize-none" autoFocus />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => { setDraft(null); setDraftHighlight(null); }} className="px-2.5 py-1.5 text-xs text-gray-500">取消</button>
                <button disabled={saving || !requirement.trim()} onClick={save} className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">保存</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {annotations.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs leading-5 text-gray-400">{mode === 'edit' ? '点击“添加标注”，再选择原型中的区域' : '这个版本暂无 UI 标注'}</div>
            ) : annotations.map((item, index) => (
              <button key={item.id} onClick={() => locate(item)} className={`mb-2 w-full rounded-xl border p-3 text-left transition-colors ${selected?.id === item.id ? 'border-violet-300 bg-violet-50' : 'border-gray-100 hover:border-violet-200'}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">U{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-gray-800">{item.requirement}</p>
                    {item.keep && <p className="mt-1.5 text-xs leading-4 text-gray-500"><span className="font-medium">保持：</span>{item.keep}</p>}
                  </div>
                  {mode === 'edit' && <span onClick={(event) => { event.stopPropagation(); remove(item.id); }} className="rounded p-1 text-gray-300 hover:bg-white hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></span>}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
