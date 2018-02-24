const request  = require('superagent')
const express  = require('express');
const Repo     = require('../models/Repo')
const Donation = require('../models/Donation')
const badge    = require('../lib/badge')
const repoUtil = require('../lib/repo')
const router   = express.Router();

function svg (req, res, next) {
  res.set('Content-Type', 'image/svg+xml')
  res.set('Vary', 'Accept-Encoding')
  next()
}


router.get('/', function(req, res) {
  res.send('Repos home page');
});

router.get('/:org/:repo.json', function(req, res) {
  request
    .get('https://api.github.com/repos/' + req.params.org + '/' + req.params.repo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/vnd.github.v3+json')
    .end((err, resp) => {
      if (resp.status == 200) {
        const ghRepo = JSON.parse(resp.text)
        repoUtil.findByName(req.params.org, req.params.repo).then((repo) => {
          res.set('Content-Type', 'application/json')
          res.status(200).send(JSON.stringify({
            readme: repo,
            github: ghRepo
          }))
        })
      }
      else {
        res.status(404).send({errors: 'Repo not found on GitHub'})
      }
    })
})


router.post('/:org/:repo/donate', function(req, res) {
  repoUtil.findByName(req.params.org, req.params.repo).then((repo) => {
    if (!repo) {
      return res.status(400).send('Repo not found')
    }
    let confirmed = false
    if (!confirmed) {
      res.status(500).send({error: 'Could not confirm'})
    }
    repo.donate(req.body.amount, req.body.currency, req.body.from).then((donation) => {
      res.send({donation: donation})
    })
    .catch((err) => {
      res.send({error: err}).status(500)
    })
  })
});

router.get('/:org/:repo/donations/preview', svg, function(req, res) {
  const preview = Donation.build(req.query)
  badge({
    text: [preview.getFrom(), preview.getAmount()]
  }).then(svg => {
    res.send(svg)
  })
})

router.get('/:org/:repo/donations/latest/:num?', svg, function(req, res) {
  repoUtil.findByName(req.params.org, req.params.repo).then((repo) => {
    repo.latestDonation(req.params.num).then((donation) => {
      donation.badge().then(svg => {
        res.send(svg)
      });
    }).catch((err) => {
      res.status(500).send(err.toString())
    })
  })
});

router.get('/:org/:repo/donations/top/:num?', svg, function(req, res) {
  repoUtil.findByName(req.params.org, req.params.repo).then((repo) => {
    repo.topDonation(req.params.num).then((donation) => {
      donation.badge().then(svg => {
        res.send(svg)
      });
    }).catch((err) => {
      res.status(500).send(err.toString())
    })
  })
});

router.get('/:id', function(req, res) {
  Repo.findById(req.params.id).then((repo) => {
    res.send(repo.org + '/' + repo.name)
  })
});


module.exports = router;