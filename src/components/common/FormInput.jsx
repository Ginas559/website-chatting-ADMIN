const FormInput = ({
    label,
    error,
    type = 'text',
    multiline = false,
    rows = 4,
    leftElement,
    rightElement,
    helperText,
    className = '',
    ...props
}) => {
    const inputClassName = `w-full rounded-2xl border bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
        error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
    } ${leftElement ? 'pl-11' : ''} ${rightElement ? 'pr-12' : ''} ${className}`;

    const field = multiline ? (
        <textarea className={inputClassName} rows={rows} {...props} />
    ) : (
        <input className={inputClassName} type={type} {...props} />
    );

    return (
        <label className="block text-left">
            {label ? <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span> : null}
            <div className="relative">
                {leftElement ? (
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        {leftElement}
                    </span>
                ) : null}

                {field}

                {rightElement ? (
                    <span className="absolute inset-y-0 right-4 flex items-center">
                        {rightElement}
                    </span>
                ) : null}
            </div>
            {helperText ? <p className="mt-2 text-xs text-slate-500">{helperText}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </label>
    );
};

export default FormInput;