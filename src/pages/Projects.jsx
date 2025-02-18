function Projects() {
  const projects = [
    {
      title: "Computer Vision Research Projects",
      description: "Working on cutting-edge computer vision research projects at VNNIC, focusing on deep learning applications in image processing and analysis.",
      technologies: ["PyTorch", "Computer Vision", "Deep Learning"],
      demoLink: "#",
      githubLink: "#"
    },
    {
      title: "Deep Learning Model Optimization",
      description: "Implemented and optimized deep learning models for computer vision tasks, improving both accuracy and computational efficiency.",
      technologies: ["PyTorch", "CUDA", "Model Optimization"],
      link: "#"
    },
    {
      title: "MLOps Pipeline Development",
      description: "Developed automated pipelines for training and deploying computer vision models, ensuring reproducibility and efficiency.",
      technologies: ["Docker", "Git", "CI/CD", "Python"],
      link: "#"
    }
  ]

  return (
    <div className="projects">
      <h1>My Projects</h1>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <div key={index} className="project-card">
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="technologies">
              {project.technologies.map((tech, i) => (
                <span key={i} className="tech-tag">{tech}</span>
              ))}
            </div>
            <div className="project-links">
              {project.demoLink && (
                <a href={project.demoLink} target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-external-link-alt"></i> Live Demo
                </a>
              )}
              {project.githubLink && (
                <a href={project.githubLink} target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-github"></i> View Code
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Projects 