type Props = { colour: string; mastery: number; boss?: boolean; title?: string };

/**
 * A Falu-red cabin. Decorations appear at 25 % (window boxes), 50 % (flag),
 * 75 % (lantern) and 100 % (birch tree). Beating the boss adds a golden star on the roof.
 */
export function Cabin({ colour, mastery, boss, title }: Props) {
  const m = mastery * 100;
  return (
    <svg className="cabin-svg" viewBox="0 0 160 110" role="img" aria-label={title ?? 'Cabin'}>
      <rect x="0" y="96" width="160" height="14" rx="3" fill="var(--moss)" opacity="0.85" />
      {m >= 100 && (
        <g aria-hidden="true">
          <rect x="138" y="40" width="5" height="58" fill="var(--trim)" stroke="var(--muted)" strokeWidth="0.6" />
          <rect x="138" y="52" width="5" height="2" fill="var(--ink)" />
          <rect x="138" y="70" width="5" height="2" fill="var(--ink)" />
          <circle cx="140" cy="38" r="13" fill="var(--moss)" />
          <circle cx="131" cy="48" r="9" fill="var(--moss)" />
          <circle cx="149" cy="50" r="9" fill="var(--moss)" />
        </g>
      )}
      <path d="M28 52 L80 20 L132 52 Z" fill="var(--roof)" />
      <rect x="34" y="50" width="92" height="48" fill={`var(--${colour})`} />
      <path d="M24 54 L80 18 L136 54" fill="none" stroke="var(--trim)" strokeWidth="4" strokeLinejoin="round" />
      {boss && (
        <path
          aria-hidden="true"
          d="M80 2 l3.5 7.2 7.9 1.1 -5.7 5.6 1.3 7.9 -7-3.7 -7 3.7 1.3-7.9 -5.7-5.6 7.9-1.1z"
          fill="var(--ochre)"
          stroke="var(--ink)"
          strokeWidth="0.8"
        />
      )}
      <rect x="70" y="66" width="20" height="32" fill="var(--trim)" />
      <rect x="73" y="69" width="14" height="29" fill="var(--roof)" />
      <rect x="44" y="62" width="16" height="14" fill="var(--trim)" />
      <rect x="46.5" y="64.5" width="11" height="9" fill="var(--lake)" opacity="0.55" />
      <rect x="100" y="62" width="16" height="14" fill="var(--trim)" />
      <rect x="102.5" y="64.5" width="11" height="9" fill="var(--lake)" opacity="0.55" />
      {m >= 25 && (
        <g aria-hidden="true">
          <rect x="42" y="76" width="20" height="5" fill="var(--trim)" />
          <circle cx="46" cy="75" r="2.2" fill="var(--ochre)" />
          <circle cx="52" cy="74.5" r="2.2" fill="var(--lupin)" />
          <circle cx="58" cy="75" r="2.2" fill="var(--ochre)" />
          <rect x="98" y="76" width="20" height="5" fill="var(--trim)" />
          <circle cx="102" cy="75" r="2.2" fill="var(--lupin)" />
          <circle cx="108" cy="74.5" r="2.2" fill="var(--ochre)" />
          <circle cx="114" cy="75" r="2.2" fill="var(--lupin)" />
        </g>
      )}
      {m >= 50 && (
        <g aria-hidden="true">
          <rect x="14" y="30" width="2.5" height="68" fill="var(--trim)" stroke="var(--muted)" strokeWidth="0.5" />
          <rect x="16.5" y="31" width="20" height="13" fill="var(--lake)" />
          <rect x="21.5" y="31" width="4" height="13" fill="var(--ochre)" />
          <rect x="16.5" y="35.5" width="20" height="4" fill="var(--ochre)" />
        </g>
      )}
      {m >= 75 && (
        <g aria-hidden="true">
          <rect x="93" y="64" width="2" height="6" fill="var(--ink)" />
          <rect x="91" y="70" width="6" height="9" rx="1.5" fill="var(--ochre)" stroke="var(--ink)" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}
