import { BASE_URL } from '../config/api';

export const AVATARS = {
    PARENT: {
        P1: require('../../assets/avatars/parent/parent_1.png'),
        P2: require('../../assets/avatars/parent/parent_2.png'),
        P3: require('../../assets/avatars/parent/parent_3.png'),
        P4: require('../../assets/avatars/parent/parent_4.png'),
        P5: require('../../assets/avatars/parent/parent_5.png'),
        P6: require('../../assets/avatars/parent/parent_6.png'),
        P7: require('../../assets/avatars/parent/parent_7.png'),
        P8: require('../../assets/avatars/parent/parent_8.png'),
        P9: require('../../assets/avatars/parent/parent_9.png'),
    },
    CHILD: {
        C1: require('../../assets/avatars/child/child_1.png'),
        C2: require('../../assets/avatars/child/child_2.png'),
        C3: require('../../assets/avatars/child/child_3.png'),
        C4: require('../../assets/avatars/child/child_4.png'),
        C5: require('../../assets/avatars/child/child_5.png'),
        C6: require('../../assets/avatars/child/child_6.png'),
        C7: require('../../assets/avatars/child/child_7.png'),
        C8: require('../../assets/avatars/child/child_8.png'),
        C9: require('../../assets/avatars/child/child_9.png'),
    }
};

export const getAvatarSource = (photoUrl, type = 'CHILD', relationship = null, gender = null) => {
    // 1. If no photoUrl, return default for that type and gender/relationship
    if (!photoUrl) {
        if (type === 'CHILD') {
            return gender === 'FEMALE' ? AVATARS.CHILD.C7 : AVATARS.CHILD.C1;
        } else {
            return (relationship === 'MOTHER' || gender === 'FEMALE') ? AVATARS.PARENT.P7 : AVATARS.PARENT.P1;
        }
    }

    // 2. If it's a URL (external or absolute)
    if (typeof photoUrl === 'string') {
        if (photoUrl.startsWith('http')) {
            return { uri: photoUrl };
        }
        if (photoUrl.startsWith('/uploads')) {
            // For hosted environments using Nginx, we need to ensure /api prefix is present
            const finalPath = photoUrl.startsWith('/api') ? photoUrl : `/api${photoUrl}`;
            return { uri: `${BASE_URL}${finalPath}` };
        }
    }

    // 3. If it's a local key (e.g., 'C1', 'P5')
    const localSet = type === 'CHILD' ? AVATARS.CHILD : AVATARS.PARENT;
    if (localSet[photoUrl]) {
        return localSet[photoUrl];
    }

    // 4. Fallback logic if photoUrl is invalid but we have gender/rel context
    if (type === 'CHILD') {
        return gender === 'FEMALE' ? AVATARS.CHILD.C7 : AVATARS.CHILD.C1;
    } else {
        return (relationship === 'MOTHER' || gender === 'FEMALE') ? AVATARS.PARENT.P7 : AVATARS.PARENT.P1;
    }
};
