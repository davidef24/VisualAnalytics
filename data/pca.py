import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples

# Define the columns to drop
columns_to_drop = [
    "player_url", "fifa_update", "fifa_update_date", "potential",
     "club_jersey_number", "club_loaned_from", "club_joined_date", "club_contract_valid_until_year",
    "nation_team_id", "nation_jersey_number", "work_rate", "body_type", "release_clause_eur",
    "ls", "st", "rs", "dob","lw", "lf", "cf", "rf", "rw", "lam", "cam", "ram", "lm", "lcm", "cm", "rcm", "rm",
    "lwb", "ldm", "cdm", "rdm", "rwb", "lb", "lcb", "cb", "rcb", "rb", "gk", "nation_position", "player_tags", "player_traits"
]

# Load dataset (update file_path with your actual file)
file_path = "data/male_players (legacy)_23.csv"  # Change this to the actual dataset file
df = pd.read_csv(file_path)

## Filter only FIFA 23 players
df = df[df["fifa_version"] == 23]

# Drop the unwanted columns
df_cleaned = df.drop(columns=columns_to_drop, errors='ignore')

# Drop rows where 'value_eur' is null
df_cleaned = df_cleaned.dropna(subset=["value_eur"])

# Define columns to exclude for PCA and K-Means
excluded_columns = [
    "player_id", "fifa_version", "short_name", "dob", "player_positions",
    "league_id", "league_name", "league_level", "club_team_id", "club_name",
    "nationality_id", "nationality_name", "real_face", "player_face_url", "long_name", "value_eur", "wage_eur"
]

# Drop the excluded columns
df_pca_kmeans = df_cleaned.drop(columns=excluded_columns, errors='ignore')

#df_cleaned_nogk = df_pca_kmeans.drop(columns=["goalkeeping_speed"], errors='ignore')
#df_cleaned_nogk = df_cleaned_nogk.dropna()
df_cleaned_gk = df_pca_kmeans.fillna(df_pca_kmeans.min())

# One-Hot Encoding of categorical features
categorical_features = ["club_position", "preferred_foot"]
df_preprocessed_nogk = pd.get_dummies(df_cleaned_gk, columns=categorical_features, drop_first=True)

# Standardize Data
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_preprocessed_nogk.dropna())  # Drop NaN to avoid errors

# First t-SNE Reduction: Perform t-SNE for Dimensionality Reduction to 2 Components (intermediate step)
from sklearn.manifold import TSNE
tsne_20 = TSNE(n_components=2, random_state=42)
final_components = tsne_20.fit_transform(df_scaled)

# Convert the output into a proper DataFrame
df_tsne = pd.DataFrame(data=final_components, columns=["Dim1", "Dim2"])

## Find Best K Using Silhouette Score
#k_values = range(2, 20)
#silhouette_scores = []
#
#for k in k_values:
#    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
#    cluster_labels = kmeans.fit_predict(df_tsne)
#    score = silhouette_score(df_tsne, cluster_labels)
#    silhouette_scores.append(score)
#    print(f"Silhouette Score for k={k}: {score:.4f}")
#
## Plot Silhouette Score vs. K
#plt.figure(figsize=(10, 6))
#plt.plot(k_values, silhouette_scores, marker='o', linestyle='dashed', color='blue')
#plt.xlabel("Number of Clusters (K)")
#plt.ylabel("Silhouette Score")
#plt.title("Silhouette Score vs. Number of Clusters")
#plt.xticks(k_values)
#plt.grid(True)
#plt.show()
#
## Choose best K (highest silhouette score)
#best_k = k_values[np.argmax(silhouette_scores)]
#print(f"\nBest Number of Clusters: {best_k}")

# Apply K-Means with Best K
kmeans = KMeans(n_clusters=20, random_state=None, n_init=10)
df_tsne["Cluster"] = kmeans.fit_predict(df_tsne[["Dim1", "Dim2"]])

# Copy the Tsne_Dim1, Tsne_Dim2, and Cluster columns from df_tsne into df_cleaned_gk
df_cleaned[['Tsne_Dim1', 'Tsne_Dim2', 'Cluster']] = df_tsne[['Dim1', 'Dim2', 'Cluster']].values



# Plot t-SNE Clusters
plt.figure(figsize=(10, 6))
sns.scatterplot(x=df_tsne["Dim1"], y=df_tsne["Dim2"], hue=df_tsne["Cluster"], palette="tab20", alpha=0.7)
plt.xlabel("t-SNE Component 1")
plt.ylabel("t-SNE Component 2")
plt.title(f"t-SNE with K-Means Clusters (K={20})")
plt.legend(title="Cluster")
plt.show()



# Save the cleaned dataset
df_cleaned.to_csv("dashboard/players_with_tsne_and_clusters_data.csv", index=False)