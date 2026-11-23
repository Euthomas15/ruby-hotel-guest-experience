export const validateStaffRegistration = ({
    fullName,
    email,
    password,
}) => {
    const errors = [];

    if (
        !fullName ||
        typeof fullName !== "string" ||
        fullName.trim().length < 2
    ) {
        errors.push("Full name must contain at least 2 characters");
    }

    if (
        !email ||
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        errors.push("A valid email address is required");
    }

    if (
        !password ||
        typeof password !== "string" ||
        password.length < 8
    ) {
        errors.push("Password must contain at least 8 characters");
    }

    return errors;
};


export const validateStaffLogin = ({ email, password }) => {
    const errors = [];

    if (
        !email ||
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        errors.push("A valid email address is required");
    }

    if (!password || typeof password !== "string") {
        errors.push("Password is required");
    }

    return errors;
};