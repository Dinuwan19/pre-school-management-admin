import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const CommonHeader = ({
    title,
    showBack = false,
    rightIcon = null,
    onRightPress = null,
    backgroundColor = 'transparent'
}) => {
    const navigation = useNavigation();

    return (
        <View style={[styles.header, { backgroundColor }]}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.iconButton}
                    >
                        <ChevronLeft color={COLORS.black} size={28} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightPress}
                        style={styles.iconButton}
                    >
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        width: width,
        paddingHorizontal: SIZES.padding / 2,
    },
    leftContainer: {
        width: 50,
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    rightContainer: {
        width: 50,
        alignItems: 'flex-end',
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.black,
        textAlign: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommonHeader;
