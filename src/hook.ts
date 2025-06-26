import { useCallback, useEffect, useRef } from "react";
import {
  DeepPartial,
  DefaultValues,
  FieldValues,
  Path,
  UseFormProps,
  UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";
import { StoreApi, UseBoundStore } from "zustand";
import { deepCloneWithoutFunctions, deepCompareDifferences } from "./utils";
import { logger } from "./logger";

/**
 * Syncs a zustand store (or part of a zustand store) with the form state in react-hook-forms.
 *
 * @param useStore The zustand store that you're syncing with
 * @param storeSetter The setter function for the portion of the store that you're syncing with (similar to the handleSubmit function).
 * @param storeSelector The selector function for the portion of the store that you're syncing with (usually the defaultValues passed to useForm).
 * @param useFormResult The return value of useForm from react-hook-form.
 */
export function useSyncRHFWithStore<TStore, TFieldValues extends FieldValues>(
  useStore: UseBoundStore<StoreApi<TStore>>,
  storeSetter: (formValue: TFieldValues) => void,
  storeSelector: (state: TStore) => TFieldValues,
  {
    control,
    setValue,
    trigger,
    reset,
    getValues,
    formState,
  }: UseFormReturn<TFieldValues>,
  mode: UseFormProps<TFieldValues>["mode"] = "onSubmit",
  reValidateMode: UseFormProps<TFieldValues>["reValidateMode"] = "onChange",
): void {
  // To prevent infinite loops between form and store.
  const mutex = useRef(false);

  // Subscribe to watch all form values.
  const watchedFormValues = useWatch({ control });

  // Store refs for stable access within callbacks.
  const storeSetterRef = useRef(storeSetter);
  const storeSelectorRef = useRef(storeSelector);
  const isSubmittedRef = useRef(formState.isSubmitted);
  const setValueRef = useRef(setValue);
  const triggerRef = useRef(trigger);
  const getValuesRef = useRef(getValues);
  const resetRef = useRef(reset);

  // Update refs on each render to ensure they always point to the latest functions/values.
  storeSetterRef.current = storeSetter;
  storeSelectorRef.current = storeSelector;
  isSubmittedRef.current = formState.isSubmitted;
  setValueRef.current = setValue;
  triggerRef.current = trigger;
  getValuesRef.current = getValues;
  resetRef.current = reset;

  // Effect to handle initial form state and re-hydration on remounts.
  useEffect(() => {
    const currentStoreValues = storeSelectorRef.current(useStore.getState());
    logger.log(
      "useSyncRHFWithStore: Initial/Remount reset with store values:",
      JSON.stringify(currentStoreValues),
    );
    // Resetting the form ensures its internal state is aligned with the latest
    // store values. This is important especially on remounts where RHF might
    // briefly have an "empty" state for some fields.
    resetRef.current(currentStoreValues);
  }, [useStore, resetRef]);

  // Callback for syncing store to form.
  const handleStoreChange = useCallback(
    (state: TStore) => {
      if (!mutex.current) {
        mutex.current = true;
        const storeValues = storeSelectorRef.current(state);
        const formValues = getValuesRef.current();

        const changes = deepCompareDifferences(storeValues, formValues);
        if (changes.length > 0) {
          logger.log("Zustand => Form", JSON.stringify(changes));
          const shouldValidate = !!(
            (!isSubmittedRef.current && mode !== "onSubmit") ||
            (isSubmittedRef.current && reValidateMode !== "onSubmit")
          );

          changes.forEach(([path, newValue]) => {
            if (path === "") {
              console.warn(
                "Empty path detected in store update. This may lead to unexpected behavior.",
              );
              return;
            }
            setValueRef.current(path, newValue, {
              shouldDirty: true,
              shouldTouch: true,
            });
          });

          if (shouldValidate) {
            const pathsToValidate = changes
              .map(([path]) => path)
              .filter((path) => path !== "") as Path<TFieldValues>[];
            if (pathsToValidate.length > 0) {
              void triggerRef.current(pathsToValidate);
            } else if (changes.some(([path]) => path === "")) {
              void triggerRef.current();
            }
          }
        }
        mutex.current = false;
      }
    },
    [mode, reValidateMode],
  );

  // Callback for syncing form to store.
  const handleFormChange = useCallback(
    (formData: DeepPartial<TFieldValues>) => {
      if (!mutex.current) {
        mutex.current = true;

        const currentStoreData = storeSelectorRef.current(useStore.getState());
        const mergedFormDataWithStore = {
          ...currentStoreData,
          ...formData,
        };

        // Only push to store if there are differences.
        const hasChanged =
          deepCompareDifferences(mergedFormDataWithStore, currentStoreData)
            .length > 0;

        if (hasChanged) {
          logger.log(
            "Form => zustand",
            JSON.stringify(mergedFormDataWithStore),
          );
          storeSetterRef.current(mergedFormDataWithStore);
        } else {
          logger.log("Form => zustand: No changes detected, skipping update.");
        }

        mutex.current = false;
      }
    },
    [useStore],
  );

  // Sync form to store.
  useEffect(() => {
    handleFormChange(watchedFormValues);
  }, [handleFormChange, watchedFormValues]);

  // Sync store to form: subscribe to Zustand store changes.
  useEffect(() => {
    const unsubscribe = useStore.subscribe(handleStoreChange);
    logger.log("Zustand subscriber subscribed.");
    return () => {
      unsubscribe();
      logger.log("Zustand subscriber unsubscribed.");
    };
  }, [handleStoreChange, useStore]);
}

/**
 * A hook that works like react-hook-form's useForm, but keeps the form state in sync with a zustand store.
 *
 * Allows you to use react-hook-form with a zustand store, and have the form state be kept in sync with the store.
 *
 * By default, the form is initialized with the values from the store.
 *
 * @param useStore The zustand store that you're syncing with.
 * @param storeSetter The setter function for the portion of the store that you're syncing with (similar to the handleSubmit function).
 * @param storeSelector The selector function for the portion of the store that you're syncing with (usually the defaultValues passed to useForm)-
 * @param useFormOptions The options passed to useForm.
 * @returns The return value of useForm from react-hook-form.
 */
export function useFormWithStore<
  TStore,
  TFieldValues extends FieldValues,
  TContext = any, // eslint-disable-line @typescript-eslint/no-explicit-any
>(
  useStore: UseBoundStore<StoreApi<TStore>>,
  storeSetter: (values: TFieldValues) => void,
  storeSelector: (state: TStore) => TFieldValues,
  useFormOptions?: UseFormProps<TFieldValues, TContext>,
): UseFormReturn<TFieldValues, TContext> {
  // Default values are deep-cloned from the store's current state.
  const initialDefaultValues = deepCloneWithoutFunctions(
    storeSelector(useStore.getState()),
  ) as unknown as DefaultValues<TFieldValues>;

  const finalUseFormOptions = {
    defaultValues: initialDefaultValues,
    ...useFormOptions,
  };

  const { mode, reValidateMode } = finalUseFormOptions;
  const useFormReturn = useForm<TFieldValues, TContext>(finalUseFormOptions);

  useSyncRHFWithStore(
    useStore,
    storeSetter,
    storeSelector,
    useFormReturn,
    mode,
    reValidateMode,
  );
  return useFormReturn;
}
