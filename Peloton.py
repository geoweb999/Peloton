import pandas as pd
import os
from datetime import datetime, timedelta
import re


def analyze_cycling_workouts():
    """
    Analyze cycling workout data from CSV file and calculate weekly totals.
    """
    # Step 1: Read the CSV file
    file_path = os.path.expanduser('~/Downloads/130RFlat_workouts.csv')

    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # Step 2-3: Filter for cycling workouts only
    cycling_data = df[df['Fitness Discipline'] == 'Cycling'].copy()

    if len(cycling_data) == 0:
        print("No cycling data found. Check the 'Fitness Discipline' column values.")
        return

    # Step 4: Process timestamps correctly
    def get_week_start(timestamp_str):
        """Convert timestamp to week start (Monday) date."""
        # Remove timezone part like "(PDT)" or "(PST)"
        clean_timestamp = re.sub(r' \([^)]*\)', '', str(timestamp_str))

        # Parse the datetime
        dt = datetime.strptime(clean_timestamp, '%Y-%m-%d %H:%M')

        # Calculate Monday of this week
        days_since_monday = dt.weekday()  # Monday = 0, Sunday = 6
        monday = dt - timedelta(days=days_since_monday)

        # Return just the date part
        return monday.date()

    # Define columns to aggregate
    numeric_columns = ['Calories Burned', 'Distance (mi)', 'Total Output']

    # Apply week calculation
    cycling_data['week_start'] = cycling_data['Workout Timestamp'].apply(get_week_start)

    # Group by week and sum the metrics
    weekly_totals = cycling_data.groupby('week_start')[numeric_columns].sum().reset_index()
    weekly_totals = weekly_totals.sort_values('week_start')

    # Add workout counts per week
    workout_counts = cycling_data.groupby('week_start').size().reset_index(name='workout_count')
    weekly_totals = weekly_totals.merge(workout_counts, on='week_start')

    # Step 5: Output results
    print("WEEKLY CYCLING TOTALS (Monday to Sunday)")
    print("=" * 80)

    for _, row in weekly_totals.iterrows():
        week_start = row['week_start']
        week_end = week_start + timedelta(days=6)

        print(f"Week {week_start} to {week_end}: "
              f"Calories: {row['Calories Burned']:,}, "
              f"Miles: {row['Distance (mi)']:.2f}, "
              f"kJ: {row['Total Output']:,}")

    # Summary statistics
    print("\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print(f"Total weeks analyzed: {len(weekly_totals)}")
    print(f"Total Calories (all weeks): {weekly_totals['Calories Burned'].sum():,.0f}")
    print(f"Average weekly calories: {weekly_totals['Calories Burned'].mean():,.0f}")
    print(f"Total Miles (all weeks): {weekly_totals['Distance (mi)'].sum():.2f}")
    print(f"Average weekly miles: {weekly_totals['Distance (mi)'].mean():.2f}")
    print(f"Total kJ Output (all weeks): {weekly_totals['Total Output'].sum():,.0f}")
    print(f"Average weekly kJ: {weekly_totals['Total Output'].mean():,.0f}")

    # Additional insights
    max_calories_week = weekly_totals.loc[weekly_totals['Calories Burned'].idxmax()]
    max_miles_week = weekly_totals.loc[weekly_totals['Distance (mi)'].idxmax()]
    most_workouts_week = weekly_totals.loc[weekly_totals['workout_count'].idxmax()]

    print(f"\nPEAK PERFORMANCE:")
    print(
        f"Highest calorie week: {max_calories_week['week_start']} ({max_calories_week['Calories Burned']:,.0f} calories)")
    print(f"Highest mileage week: {max_miles_week['week_start']} ({max_miles_week['Distance (mi)']:.1f} miles)")
    print(f"Most active week: {most_workouts_week['week_start']} ({most_workouts_week['workout_count']} workouts)")


if __name__ == "__main__":
    analyze_cycling_workouts()