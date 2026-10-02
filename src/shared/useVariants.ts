import {
  reactive,
  readonly,
  provide,
  inject,
  onUnmounted,
  type InjectionKey,
  type DeepReadonly,
} from "vue";

interface VariantConfig<T extends readonly unknown[] = readonly unknown[]> {
  key: string;
  variants: T;
}

type VariantsSetup = Record<string, VariantConfig>;

type InferState<T extends VariantsSetup> = {
  [K in keyof T]: T[K]["variants"][number];
};

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Creates a typed provider/consumer pair.
 *
 * @example
 * // variants.ts
 * export const { provideAppVariants, useAppVariants } = createVariants({
 *   TaskCard:  { key: "1", variants: [true, false]    as const },
 *   TaskWidth: { key: "2", variants: ["w-32", "w-35"] as const },
 * });
 *
 * // App.vue — call once in setup()
 * import { provideAppVariants } from "@/variants.ts";
 * provideAppVariants();
 *
 * // Any descendant component
 * import { useAppVariants } from "@/variants";
 * const { variants } = useAppVariants();
 * // variants.TaskCard  → boolean
 * // variants.TaskWidth → "w-32" | "w-35"
 */
export function createVariants<T extends VariantsSetup>(config: T) {
  // Each createVariants call gets its own unique key —
  // multiple independent variant systems can coexist in the same app.
  const injectionKey: InjectionKey<DeepReadonly<InferState<T>>> = Symbol("variants");

  function provideAppVariants(): { variants: DeepReadonly<InferState<T>> } {
    const state = reactive<Record<string, unknown>>({});

    for (const [name, options] of Object.entries(config)) {
      if (options.variants.length > 0) {
        state[name] = options.variants[0];
      }
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (shouldIgnoreTarget(event.target) || event.repeat) return;

      for (const [name, options] of Object.entries(config)) {
        if (event.key === options.key) {
          event.preventDefault();
          const arr = options.variants as unknown[];
          if (arr.length === 0) continue;
          const idx = arr.indexOf(state[name]);
          state[name] = arr[(idx + 1) % arr.length];
          console.log(`[useVariants] ${name} → ${state[name]}`);
        }
      }
    }

    window.addEventListener("keydown", handleKeydown);
    onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

    const readonlyState = readonly(state) as DeepReadonly<InferState<T>>;
    provide(injectionKey, readonlyState);

    // Return state directly for use in App.vue itself
    return { variants: readonlyState };
  }

  function useAppVariants(): { variants: DeepReadonly<InferState<T>> } {
    const variants = inject(injectionKey);

    if (import.meta.env.DEV && variants === undefined) {
      console.warn(
        `[useAppVariants] Provider not found. Make sure provideAppVariants() is called in App.vue setup().`,
      );
    }

    return { variants: variants as DeepReadonly<InferState<T>> };
  }

  return { provideAppVariants, useAppVariants };
}
