import { Fragment } from 'react';

type Props = { text: string; fill?: string | null };

/** Shows the Swedish prompt with any “___” as a visible gap, filled in green after answering. */
export function Prompt({ text, fill }: Props) {
  const parts = text.split(/_{2,}/);
  const sentence = text.length > 14;
  return (
    <p className={`prompt${sentence ? ' sentence' : ''}`} lang="sv">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 &&
            (fill ? (
              <span className="gap filled">{fill}</span>
            ) : (
              <span className="gap" aria-label="blank">
                {' '}
              </span>
            ))}
        </Fragment>
      ))}
    </p>
  );
}
