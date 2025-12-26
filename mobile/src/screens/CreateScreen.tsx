import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Switch,
    Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Import z from zod
import { showToast, alert } from '../shared/platform';
import api from '../shared/api';
// import DateTimePicker from '@react-native-community/datetimepicker'; // Assuming installed or use text input for now to keep it simple without native modules if possible. 
// Actually I didn't add datetimepicker to package.json. I will use simple text input for date for now or add it later if user wants.
// For MVP, text input YYYY-MM-DD is fine or I can just mock it.
import type { CandidateInput } from '../shared/types';
import { createDateTime } from '../shared/date';

// Validation schema
const schema = z.object({
    name: z.string().min(1, 'イベント名を入力してください'),
    ownerName: z.string().min(1, '主催者名を入力してください'),
    description: z.string().optional(),
    allowMaybe: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CreateScreen({ navigation }: any) {
    const [candidates, setCandidates] = useState<CandidateInput[]>([]);
    const [newDate, setNewDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            allowMaybe: true,
        },
    });

    const addCandidate = () => {
        // Basic validation for date format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            showToast('日付を YYYY-MM-DD 形式で入力してください');
            return;
        }

        const startAt = `${newDate}T${startTime}:00`;
        const endAt = `${newDate}T${endTime}:00`;

        setCandidates([
            ...candidates,
            {
                start_at: startAt,
                end_at: endAt,
                note: '',
                order: candidates.length,
            },
        ]);
        setNewDate('');
    };

    const removeCandidate = (index: number) => {
        setCandidates(candidates.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        if (candidates.length === 0) {
            showToast('候補日を追加してください');
            return;
        }

        try {
            const schedule = await api.createSchedule({
                name: data.name,
                owner_name: data.ownerName,
                description: data.description,
                allow_maybe: data.allowMaybe,
                candidates,
            });
            showToast('イベントを作成しました');
            navigation.replace('Detail', { uuid: schedule.uuid });
        } catch (error) {
            alert('エラー', '作成に失敗しました');
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formGroup}>
                <Text style={styles.label}>イベント名 *</Text>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="例：チームミーティング"
                        />
                    )}
                />
                {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>主催者名 *</Text>
                <Controller
                    control={control}
                    name="ownerName"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="例：山田太郎"
                        />
                    )}
                />
                {errors.ownerName && <Text style={styles.error}>{errors.ownerName.message}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>説明（任意）</Text>
                <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={value}
                            onChangeText={onChange}
                            multiline
                            numberOfLines={3}
                        />
                    )}
                />
            </View>

            <View style={styles.switchContainer}>
                <Text style={styles.label}>「△」を許可</Text>
                <Controller
                    control={control}
                    name="allowMaybe"
                    render={({ field: { onChange, value } }) => (
                        <Switch
                            value={value}
                            onValueChange={onChange}
                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                            thumbColor={value ? '#0967D2' : '#f4f3f4'}
                        />
                    )}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>候補日追加</Text>
                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, { flex: 2, marginRight: 8 }]}
                        placeholder="YYYY-MM-DD"
                        value={newDate}
                        onChangeText={setNewDate}
                    />
                    <TextInput
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        placeholder="09:00"
                        value={startTime}
                        onChangeText={setStartTime}
                    />
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="10:00"
                        value={endTime}
                        onChangeText={setEndTime}
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addCandidate}>
                    <Text style={styles.buttonText}>追加</Text>
                </TouchableOpacity>

                {candidates.map((c, i) => (
                    <View key={i} style={styles.candidateRow}>
                        <Text>{c.start_at.replace('T', ' ')} ~ {c.end_at.split('T')[1]}</Text>
                        <TouchableOpacity onPress={() => removeCandidate(i)}>
                            <Text style={{ color: 'red' }}>削除</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
                <Text style={styles.submitButtonText}>イベントを作成</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    error: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    addButton: {
        backgroundColor: '#0967D2',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    candidateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    submitButton: {
        backgroundColor: '#0967D2',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
