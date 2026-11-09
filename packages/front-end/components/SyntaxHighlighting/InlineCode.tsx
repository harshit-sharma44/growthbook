import dynamic from "next/dynamic";
import {
  tomorrow as dark,
  ghcolors as light,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Suspense } from "react";
import cloneDeep from "lodash/cloneDeep";
import clsx from "clsx";
import { useAppearanceUITheme } from "@/services/AppearanceUIThemeProvider";
import { Language } from "./Code";
import PrismFallback from "./PrismFallback";

// Lazy-load syntax highlighting to improve page load time
const Prism = dynamic(() => import("./Prism"), {
  suspense: true,
});

export interface Props {
  code: string;
  language: Language;
  className?: string;
}

export default function InlineCode({ code, language, className }: Props) {
  const { theme } = useAppearanceUITheme();

  const style = cloneDeep(theme === "light" ? light : dark);
  style['code[class*="language-"]'].fontSize = "0.85rem";
  style['code[class*="language-"]'].lineHeight = 1.5;
  style['code[class*="language-"]'].fontWeight = 600;
  // Wrap long values instead of overflowing the container. react-syntax-highlighter
  // forces `white-space: pre` on the <code> tag, so the `wrap-code` class below
  // overrides it with CSS.
  style['pre[class*="language-"]'].whiteSpace = "pre-wrap";
  style['pre[class*="language-"]'].overflowWrap = "anywhere";
  style['code[class*="language-"]'].whiteSpace = "pre-wrap";
  style['code[class*="language-"]'].overflowWrap = "anywhere";

  return (
    <Suspense
      fallback={
        <PrismFallback
          language={language}
          style={style}
          className={clsx(
            "border-0 p-0 m-0 bg-transparent wrap-code",
            className
          )}
          code={code}
        />
      }
    >
      <Prism
        language={language}
        style={style}
        className={clsx("border-0 p-0 m-0 bg-transparent wrap-code", className)}
        showLineNumbers={false}
      >
        {code}
      </Prism>
    </Suspense>
  );
}
