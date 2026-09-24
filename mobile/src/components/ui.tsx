/** Small themed UI kit shared by all screens */

import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';

export function Screen({
    children,
    refreshing,
    onRefresh,
    contentStyle,
}: {
    children: React.ReactNode;
    refreshing?: boolean;
    onRefresh?: () => void;
    contentStyle?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={[styles.screenContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
                onRefresh ? (
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                ) : undefined
            }
        >
            {children}
        </ScrollView>
    );
}

export function Loading() {
    const { colors } = useTheme();
    return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    const { colors, radius } = useTheme();
    return (
        <View
            style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius },
                style,
            ]}
        >
            {children}
        </View>
    );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
    const { colors } = useTheme();
    return (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, style]}>
            {children}
        </Text>
    );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
    const { colors } = useTheme();
    return (
        <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
                {children}
            </Text>
            {right}
        </View>
    );
}

export function Body({
    children,
    muted,
    style,
    numberOfLines,
    selectable,
    accessibilityLabel,
}: {
    children: React.ReactNode;
    muted?: boolean;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    selectable?: boolean;
    accessibilityLabel?: string;
}) {
    const { colors } = useTheme();
    return (
        <Text
            accessibilityLabel={accessibilityLabel}
            numberOfLines={numberOfLines}
            selectable={selectable}
            style={[styles.body, { color: muted ? colors.muted : colors.text }, style]}
        >
            {children}
        </Text>
    );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
    title,
    onPress,
    variant = 'primary',
    loading,
    disabled,
    small,
    style,
    accessibilityLabel,
}: {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    small?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}) {
    const { colors, radius } = useTheme();
    const bg: Record<ButtonVariant, string> = {
        primary: colors.primary,
        secondary: colors.primarySubtle,
        danger: colors.danger,
        ghost: 'transparent',
    };
    const fg: Record<ButtonVariant, string> = {
        primary: colors.onPrimary,
        secondary: colors.primary,
        danger: colors.background,
        ghost: colors.primary,
    };
    const inactive = disabled || loading;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityState={{ disabled: !!inactive, busy: !!loading }}
            disabled={inactive}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                small && styles.buttonSmall,
                {
                    backgroundColor: bg[variant],
                    borderRadius: radius,
                    borderColor: variant === 'ghost' ? colors.border : bg[variant],
                    opacity: inactive ? 0.55 : pressed ? 0.8 : 1,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={fg[variant]} />
            ) : (
                <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg[variant] }]}>{title}</Text>
            )}
        </Pressable>
    );
}

export function TextField({
    label,
    error,
    hint,
    style,
    ...props
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
    const { colors, radius } = useTheme();
    return (
        <View style={[styles.field, style as StyleProp<ViewStyle>]}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={colors.muted}
                {...props}
                style={[
                    styles.input,
                    props.multiline && styles.inputMultiline,
                    {
                        color: colors.text,
                        backgroundColor: colors.card,
                        borderColor: error ? colors.danger : colors.border,
                        borderRadius: radius,
                    },
                ]}
            />
            {hint && !error ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
            {error ? <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text> : null}
        </View>
    );
}

export function SwitchRow({
    label,
    value,
    onValueChange,
    hint,
}: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    hint?: string;
}) {
    const { colors } = useTheme();
    return (
        <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.body, { color: colors.text }]}>{label}</Text>
                {hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
            </View>
            <Switch
                accessibilityLabel={label}
                value={value}
                onValueChange={onValueChange}
                trackColor={{ true: colors.primary, false: colors.border }}
            />
        </View>
    );
}

/** Segmented single choice */
export function Choice<T extends string | number>({
    options,
    value,
    onChange,
    label,
}: {
    options: { value: T; label: string; accessibilityLabel?: string }[];
    value: T | null;
    onChange: (value: T) => void;
    label?: string;
}) {
    const { colors, radius } = useTheme();
    return (
        <View style={styles.field}>
            {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
            <View style={styles.choiceRow} accessibilityRole="radiogroup">
                {options.map((option) => {
                    const selected = option.value === value;
                    return (
                        <Pressable
                            key={String(option.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            accessibilityLabel={option.accessibilityLabel ?? option.label}
                            onPress={() => onChange(option.value)}
                            style={[
                                styles.choice,
                                {
                                    borderRadius: radius,
                                    borderColor: selected ? colors.primary : colors.border,
                                    backgroundColor: selected ? colors.primarySubtle : colors.card,
                                },
                            ]}
                        >
                            <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: selected ? '700' : '400' }}>
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) {
    const { colors } = useTheme();
    const color = {
        neutral: colors.muted,
        primary: colors.primary,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
    }[tone];
    return (
        <View style={[styles.badge, { borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

export function ErrorBanner({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
    const { colors, radius } = useTheme();
    return (
        <View
            accessibilityRole="alert"
            style={[styles.banner, { borderColor: colors.danger, borderRadius: radius, backgroundColor: colors.card }]}
        >
            <Text style={{ color: colors.danger, flex: 1 }}>{message}</Text>
            {onRetry && retryLabel ? <Button title={retryLabel} onPress={onRetry} variant="ghost" small /> : null}
        </View>
    );
}

export function InfoBanner({ children }: { children: React.ReactNode }) {
    const { colors, radius } = useTheme();
    return (
        <View style={[styles.banner, { borderColor: colors.primary, borderRadius: radius, backgroundColor: colors.primarySubtle }]}>
            <View style={{ flex: 1 }}>{children}</View>
        </View>
    );
}

export function EmptyState({ message }: { message: string }) {
    const { colors } = useTheme();
    return <Text style={[styles.empty, { color: colors.muted }]}>{message}</Text>;
}

export function ListItem({
    title,
    subtitle,
    right,
    onPress,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
}) {
    const { colors } = useTheme();
    return (
        <Pressable
            accessibilityRole={onPress ? 'button' : undefined}
            disabled={!onPress}
            onPress={onPress}
            style={({ pressed }) => [styles.listItem, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
            <View style={{ flex: 1 }}>
                <Text style={[styles.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={[styles.hint, { color: colors.muted }]} numberOfLines={2}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {right}
        </Pressable>
    );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
    screenContent: { padding: 16, paddingBottom: 48, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
    title: { fontSize: 22, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
    body: { fontSize: 15, lineHeight: 21 },
    button: {
        minHeight: 46,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    buttonSmall: { minHeight: 34, paddingHorizontal: 12 },
    buttonText: { fontSize: 16, fontWeight: '700' },
    buttonTextSmall: { fontSize: 14 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600' },
    input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 44 },
    inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
    hint: { fontSize: 13, lineHeight: 18 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, minWidth: 44, alignItems: 'center' },
    badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
    badgeText: { fontSize: 12, fontWeight: '700' },
    banner: { borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    empty: { textAlign: 'center', paddingVertical: 16 },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
