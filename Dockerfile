FROM jekyll/jekyll

COPY . /srv/jekyll
EXPOSE 8080
CMD jekyll serve --port 8080