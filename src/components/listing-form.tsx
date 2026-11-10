import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button, ChoiceList, ErrorText, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/icon';
import { CATEGORIES, CATEGORY_ICONS, CONDITIONS, MAX_PHOTOS, type Category, type Condition } from '@/constants/listings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { photoUrl, type FormPhoto } from '@/lib/listings';


const schema = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(80, 'Keep it under 80 characters'),
  price: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a price in whole rupees, e.g. 500 (0 means free)')
    .refine((v) => Number(v) <= 10000000, 'That price is too high'),
  category: z.enum(CATEGORIES, { error: 'Pick a category' }),
  condition: z.enum(CONDITIONS, { error: 'Pick a condition' }),
  description: z.string().trim().max(2000, 'Keep it under 2000 characters'),
});
type FormValues = z.input<typeof schema>;

export type ListingFormValues = {
  title: string;
  price: number;
  category: Category;
  condition: Condition;
  description: string;
};

type Props = {
  /** Filled in when editing an existing item. */
  initial?: Partial<ListingFormValues>;
  initialPhotos?: FormPhoto[];
  submitLabel: string;
  submittingLabel: string;
  /** Save the item. Throw an Error to show its message. Return true to clear the form. */
  onSubmit: (values: ListingFormValues, photos: FormPhoto[]) => Promise<boolean | void>;
};

// The form for posting or editing an item: photos, title, price, category, condition, description.
export function ListingForm({ initial, initialPhotos = [], submitLabel, submittingLabel, onSubmit }: Props) {
  const theme = useTheme();
  const [photos, setPhotos] = useState<FormPhoto[]>(initialPhotos);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      price: initial?.price != null ? String(initial.price) : '',
      description: initial?.description ?? '',
      category: initial?.category,
      condition: initial?.condition,
    },
  });

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 1,
    });
    if (!result.canceled) {
      const added: FormPhoto[] = result.assets.map((a) => ({ kind: 'new', uri: a.uri }));
      setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
    }
  };

  const submit = handleSubmit(async (values) => {
    if (!photos.length) {
      setServerError('Add at least one photo');
      return;
    }
    setServerError(null);
    try {
      const clear = await onSubmit(
        {
          title: values.title.trim(),
          description: values.description.trim(),
          price: Number(values.price),
          category: values.category,
          condition: values.condition,
        },
        photos,
      );
      if (clear) {
        reset();
        setPhotos([]);
      }
    } catch (e) {
      setServerError((e as Error).message);
    }
  });

  return (
    <>
      <View style={styles.section}>
        <ThemedText type="smallBold">
          Photos ({photos.length}/{MAX_PHOTOS}) · the first one is the cover
        </ThemedText>
        <View style={styles.photos}>
          {photos.map((p, i) => (
            <View key={`${i}-${p.kind === 'new' ? p.uri : p.path}`} style={styles.photoWrap}>
              <Image
                source={{ uri: p.kind === 'new' ? p.uri : photoUrl(p.path) }}
                style={styles.photo}
                contentFit="cover"
              />
              <Pressable
                accessibilityLabel="Remove photo"
                onPress={() => setPhotos((current) => current.filter((_, j) => j !== i))}
                style={styles.removePhoto}>
                <Icon name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable onPress={addPhotos} style={[styles.addPhoto, { backgroundColor: theme.backgroundElement }]}>
              <Icon name="camera-outline" size={26} color={theme.textSecondary} />
              <ThemedText type="small">Add photos</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label="Title"
            placeholder="e.g. Casio scientific calculator"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.title?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="price"
        render={({ field }) => (
          <TextField
            label="Price (₹)"
            placeholder="e.g. 500"
            keyboardType="number-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.price?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <View style={styles.section}>
            <ThemedText type="smallBold">Category</ThemedText>
            <ChoiceList options={CATEGORIES} value={field.value} onChange={field.onChange} icons={CATEGORY_ICONS} />
            {errors.category?.message ? <ErrorText>{errors.category.message}</ErrorText> : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="condition"
        render={({ field }) => (
          <View style={styles.section}>
            <ThemedText type="smallBold">Condition</ThemedText>
            <ChoiceList options={CONDITIONS} value={field.value} onChange={field.onChange} />
            {errors.condition?.message ? <ErrorText>{errors.condition.message}</ErrorText> : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Description (optional)"
            placeholder="Anything a buyer should know: age, size, any marks..."
            multiline
            numberOfLines={4}
            style={styles.description}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.description?.message}
          />
        )}
      />

      {serverError ? <ErrorText>{serverError}</ErrorText> : null}
      <Button title={isSubmitting ? submittingLabel : submitLabel} onPress={submit} loading={isSubmitting} />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoWrap: {
    width: 88,
    height: 88,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.two,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
