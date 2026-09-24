/**
 * Date/time field — iOS/Android implementation using @react-native-community/datetimepicker.
 * Android opens the system dialogs (date, then time for "datetime"); iOS shows an inline picker.
 */

import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { formatDate, formatDateTime, formatTime } from '../lib/date';
import { useTheme } from '../theme';
import { Button, styles } from './ui';
import type { DateTimeFieldProps } from './DateTimeField.types';

export default function DateTimeField({
    label,
    value,
    onChange,
    mode,
    minimumDate,
    placeholder,
    error,
    onClear,
    clearLabel,
}: DateTimeFieldProps) {
    const { colors, radius, scheme } = useTheme();
    const { locale, t } = useI18n();
    const [open, setOpen] = useState(false);

    const display =
        value == null
            ? placeholder ?? ''
            : mode === 'date'
              ? formatDate(value, locale)
              : mode === 'time'
                ? formatTime(value, locale)
                : formatDateTime(value, locale);

    const openAndroid = () => {
        const base = value ?? new Date();
        const pickTime = (day: Date) =>
            DateTimePickerAndroid.open({
                value: day,
                mode: 'time',
                is24Hour: true,
                onChange: (event: DateTimePickerEvent, picked?: Date) => {
                    if (event.type === 'set' && picked) onChange(picked);
                },
            });
        if (mode === 'time') {
            pickTime(base);
            return;
        }
        DateTimePickerAndroid.open({
            value: base,
            mode: 'date',
            minimumDate,
            onChange: (event: DateTimePickerEvent, picked?: Date) => {
                if (event.type !== 'set' || !picked) return;
                const day = new Date(picked);
                day.setHours(base.getHours(), base.getMinutes(), 0, 0);
                if (mode === 'datetime') pickTime(day);
                else onChange(day);
            },
        });
    };

    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${display}`}
                onPress={() => (Platform.OS === 'android' ? openAndroid() : setOpen((v) => !v))}
                style={[
                    styles.input,
                    {
                        justifyContent: 'center',
                        backgroundColor: colors.card,
                        borderColor: error ? colors.danger : open ? colors.primary : colors.border,
                        borderRadius: radius,
                    },
                ]}
            >
                <Text style={{ color: value ? colors.text : colors.muted, fontSize: 16 }}>{display}</Text>
            </Pressable>
            {Platform.OS === 'ios' && open ? (
                <View>
                    <DateTimePicker
                        value={value ?? new Date()}
                        mode={mode}
                        display={mode === 'date' ? 'inline' : 'spinner'}
                        minimumDate={minimumDate}
                        minuteInterval={5}
                        themeVariant={scheme}
                        onChange={(_event: DateTimePickerEvent, picked?: Date) => picked && onChange(picked)}
                    />
                    <Button title={t('common.done')} onPress={() => setOpen(false)} variant="ghost" small />
                </View>
            ) : null}
            {onClear && value && clearLabel ? <Button title={clearLabel} onPress={onClear} variant="ghost" small /> : null}
            {error ? <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text> : null}
        </View>
    );
}
