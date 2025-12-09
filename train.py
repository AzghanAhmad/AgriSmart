import matplotlib.pyplot as plt

# --- 1. Project Data (From your previous request) ---
months = [0, 1, 2, 3]
pv = [0, 1691.94, 3383.88, 4399.04] # Planned Value (PV)
ev = [0, 1488.91, 2842.46, 3925.30] # Earned Value (EV)
ac = [0, 1624.26, 3113.17, 4196.01] # Actual Cost (AC)

# Project Completion Data
bac_month = 4
bac = 6767.75 # Budget At Completion

# Current Month (for variance lines)
current_month = 3

# Calculated Variances at Month 3
cv = ev[-1] - ac[-1] # 3925.30 - 4196.01 = -270.71
sv = ev[-1] - pv[-1] # 3925.30 - 4399.04 = -473.74
cpi = ev[-1] / ac[-1] # 0.935
spi = ev[-1] / pv[-1] # 0.892

# Forecasts (From your previous interpretation)
eac = 7234.49
estimated_duration = 5.2 # months

# --- 2. Chart Plotting ---
plt.figure(figsize=(10, 6))

# Plot PV, EV, AC Lines
plt.plot(months, pv, label='Planned Value (PV)', color='#1f77b4', marker='o', linewidth=2) # Blue
plt.plot(months, ev, label='Earned Value (EV)', color='#2ca02c', marker='s', linewidth=2) # Green
plt.plot(months, ac, label='Actual Cost (AC)', color='#ff7f0e', marker='^', linewidth=2) # Orange

# Plot BAC line and point at target end date (Month 4)
plt.axhline(y=bac, color='#9467bd', linestyle=':', linewidth=2, label=f'BAC = ${bac:.2f}')
plt.plot(bac_month, bac, 'D', color='#9467bd', markersize=8) # Diamond marker for BAC

# --- 3. Highlight Current Status (Month 3) ---
# Vertical line at Current Month
plt.axvline(x=current_month, color='red', linestyle='--', linewidth=1, alpha=0.6)

# Markers at Month 3 (Current Status)
plt.plot(current_month, pv[-1], 'o', color='#1f77b4', markersize=10)
plt.plot(current_month, ev[-1], 's', color='#2ca02c', markersize=10)
plt.plot(current_month, ac[-1], '^', color='#ff7f0e', markersize=10)

# --- 4. Add Annotations (Based on the example chart) ---
# Add Performance Summary Box (simplified text box)
summary_text = (
    f"Performance Summary (Month {current_month})\n"
    f"Cost Performance Index (CPI): {cpi:.3f}\n"
    f"Schedule Performance Index (SPI): {spi:.3f}\n"
    f"Status: OVER BUDGET & BEHIND SCHEDULE\n"
    f"Estimate at Completion (EAC): ${eac:.2f}\n"
    f"Estimated Total Duration: {estimated_duration:.1f} months (vs {bac_month:.1f} target)"
)
plt.text(0.1, 0.1, summary_text, transform=plt.gca().transAxes,
         bbox=dict(boxstyle="round,pad=0.5", fc="lightyellow", alpha=0.9))

# Add Variance Callouts (Simplified to avoid overlap)
plt.text(current_month + 0.05, ac[-1] + 100, f'AC = ${ac[-1]:.2f}', color='#ff7f0e')
plt.text(current_month + 0.05, ev[-1] - 150, f'EV = ${ev[-1]:.2f}', color='#2ca02c')

# Add Title and Labels
plt.title('Earned Value Management Chart - Social Balance Agent Project')
plt.xlabel('Time (Months)')
plt.ylabel('Cost ($)')
plt.legend(loc='center left', bbox_to_anchor=(0.1, 0.75), framealpha=1, edgecolor='black')
plt.grid(True, alpha=0.4)

# Set Axes Limits (Adjusted for your data up to $8000)
plt.xlim(0, 4.5)
plt.ylim(0, 8000)

# Save and Show the Chart
plt.tight_layout()
plt.savefig('social_balance_agent_evm_chart.png')
# plt.show()