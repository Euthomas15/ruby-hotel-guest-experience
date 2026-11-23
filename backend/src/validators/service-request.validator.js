export const validateServiceRequest = ({
    category,
    description,
}) => {
    const errors = [];

    if (!category  || typeof category !== "string" || !category.trim()) {
        errors.push("Service request category is required");
    }

    if (
        !description ||
        typeof description !== "string" ||
        description.trim().length < 5
    ) {
        errors.push(
            "Description must contain at least 5 characters"
        );
    }

    return errors;
};