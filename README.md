## zustand-rhf-sync

Syncs zustand's store state with the form state in [react-hook-forms](react-hook-form.com).

This allows form updates to immediately reflect in your store and allows the components that subscribe to your store to update based on form updates.

Convenient if you want to use your store functions or selectors with form data.

## Install

```bash
npm install -save @jariikonen/zustand-rhf-sync
```

## Usage

```typescript
import { useFormWithStore } from "@jariikonen/zustand-rhf-sync";

// use it just like useForm
// where default value is automatically populated from your store
const { register } = useFormWithStore(
  useBoundStore,
  (formData) => useBoundStore.setState({ form: formData }),
  (state) => state.formData,
  useFormOptions,
);
```

## A couple of things to note

For the fieldArray values to be correctly synced there are a couple of things to note. First, `useFieldArray()`'s `shouldUnregister` parameter must be set to `false` (which is the default value). Do not use browser's reset functionality by setting the reset button (or input) type as `'reset'`. This messes RHF's state. The correct way to clear the form is to use the `reset()` function from RHF's `useForm()` or by setting the values in zustand to default values.
