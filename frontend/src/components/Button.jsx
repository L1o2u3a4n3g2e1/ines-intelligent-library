export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button className={`button button-${variant} button-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}
